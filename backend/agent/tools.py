import os
import json
import time
import requests
import subprocess
import tempfile
from bs4 import BeautifulSoup
from tavily import TavilyClient
from .documents import search_documents as _search_documents

_tavily = None

# Simple in-memory TTL cache for idempotent, expensive lookups (web_search / read_url).
# Cuts latency, third-party API spend, and rate-limit exposure on repeated queries.
_CACHE_TTL_SECONDS = 600
_tool_cache: dict[str, tuple[float, dict]] = {}


def _cache_get(key: str):
    entry = _tool_cache.get(key)
    if not entry:
        return None
    expires_at, value = entry
    if time.time() > expires_at:
        _tool_cache.pop(key, None)
        return None
    return value


def _cache_set(key: str, value: dict):
    _tool_cache[key] = (time.time() + _CACHE_TTL_SECONDS, value)

def _get_tavily():
    global _tavily
    if _tavily is None:
        _tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
    return _tavily


def web_search(query: str, max_results: int = 5) -> dict:
    """Search the web for current information using Tavily."""
    cache_key = f"web_search:{query.strip().lower()}:{max_results}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return {**cached, "cached": True}

    try:
        client = _get_tavily()
        response = client.search(query=query, max_results=max_results, include_answer=True)
        results = []
        for r in response.get("results", []):
            results.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "content": r.get("content", "")[:500],
            })
        result = {
            "answer": response.get("answer", ""),
            "results": results,
        }
        _cache_set(cache_key, result)
        return result
    except Exception as e:
        return {"error": str(e), "results": []}


def read_url(url: str) -> dict:
    """Fetch and extract clean text content from a URL."""
    cache_key = f"read_url:{url.strip()}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return {**cached, "cached": True}

    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; DeepAgent/1.0)"}
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        lines = [line for line in text.splitlines() if len(line.strip()) > 30]
        content = "\n".join(lines[:150])
        result = {"url": url, "content": content, "length": len(content)}
        _cache_set(cache_key, result)
        return result
    except Exception as e:
        return {"error": str(e), "url": url}


# Maps a language name to (file extension, command template). {path} is replaced with the temp file path.
_LANGUAGE_RUNNERS = {
    "python": (".py", ["python3", "{path}"]),
    "javascript": (".js", ["node", "{path}"]),
    "typescript": (".ts", ["npx", "--yes", "ts-node", "{path}"]),
    "bash": (".sh", ["bash", "{path}"]),
    "shell": (".sh", ["bash", "{path}"]),
}


def execute_code(code: str, language: str = "python") -> dict:
    """Execute code in a sandboxed subprocess for the requested language and return stdout/stderr."""
    language = language.lower().strip()
    runner = _LANGUAGE_RUNNERS.get(language)
    if not runner:
        return {
            "error": f"Unsupported language '{language}'. Supported: {', '.join(sorted(_LANGUAGE_RUNNERS))}",
            "stdout": "",
            "stderr": "",
        }

    suffix, command_template = runner
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, mode="w", delete=False) as f:
            f.write(code)
            tmp_path = f.name

        command = [part.format(path=tmp_path) for part in command_template]
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=20,
        )
        return {
            "language": language,
            "stdout": result.stdout[:3000],
            "stderr": result.stderr[:1000],
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"error": "Code execution timed out (20s limit)", "stdout": "", "stderr": ""}
    except FileNotFoundError as e:
        return {"error": f"Runtime not available for '{language}': {e}", "stdout": "", "stderr": ""}
    except Exception as e:
        return {"error": str(e), "stdout": "", "stderr": ""}
    finally:
        if tmp_path:
            os.unlink(tmp_path)


# OpenAI function-calling schemas for all tools
TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for current, up-to-date information on any topic. Use this when you need facts, news, or data you don't already know.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to look up",
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Number of results to return (default 5, max 10)",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_url",
            "description": "Fetch and read the full text content of a specific webpage URL. Use after web_search to get more details from a specific result.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The full URL to fetch and read",
                    }
                },
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "execute_code",
            "description": (
                "Execute code in a sandboxed subprocess for calculations, data processing, scripting, "
                "or demonstrating a solution. Supports multiple languages — pick whichever language best "
                "fits the user's request or the language they explicitly asked for. Returns stdout/stderr."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "The source code to execute",
                    },
                    "language": {
                        "type": "string",
                        "description": "Programming language of the code",
                        "enum": sorted(_LANGUAGE_RUNNERS.keys()),
                        "default": "python",
                    },
                },
                "required": ["code"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_documents",
            "description": (
                "Search documents the user has uploaded in this session (PDF/text/markdown). "
                "Use this whenever the user references 'the document', 'the file', 'the PDF I uploaded', etc."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "What to search for within the uploaded documents",
                    }
                },
                "required": ["query"],
            },
        },
    },
]


# Tools that need the current session_id injected (not exposed to the LLM as a parameter)
_SESSION_AWARE_TOOLS = {"search_documents"}

TOOL_REGISTRY = {
    "web_search": web_search,
    "read_url": read_url,
    "execute_code": execute_code,
    "search_documents": _search_documents,
}


def run_tool(name: str, args: dict, session_id: str | None = None) -> str:
    fn = TOOL_REGISTRY.get(name)
    if not fn:
        return json.dumps({"error": f"Unknown tool: {name}"})
    if name in _SESSION_AWARE_TOOLS:
        result = fn(session_id=session_id, **args)
    else:
        result = fn(**args)
    return json.dumps(result, ensure_ascii=False)
