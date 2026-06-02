import os
import json
import requests
import subprocess
import tempfile
from bs4 import BeautifulSoup
from tavily import TavilyClient

_tavily = None

def _get_tavily():
    global _tavily
    if _tavily is None:
        _tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
    return _tavily


def web_search(query: str, max_results: int = 5) -> dict:
    """Search the web for current information using Tavily."""
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
        return {
            "answer": response.get("answer", ""),
            "results": results,
        }
    except Exception as e:
        return {"error": str(e), "results": []}


def read_url(url: str) -> dict:
    """Fetch and extract clean text content from a URL."""
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
        return {"url": url, "content": content, "length": len(content)}
    except Exception as e:
        return {"error": str(e), "url": url}


def execute_python(code: str) -> dict:
    """Execute Python code in a sandboxed subprocess and return stdout/stderr."""
    try:
        with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
            f.write(code)
            tmp_path = f.name
        result = subprocess.run(
            ["python3", tmp_path],
            capture_output=True,
            text=True,
            timeout=15,
        )
        os.unlink(tmp_path)
        return {
            "stdout": result.stdout[:3000],
            "stderr": result.stderr[:1000],
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"error": "Code execution timed out (15s limit)", "stdout": "", "stderr": ""}
    except Exception as e:
        return {"error": str(e), "stdout": "", "stderr": ""}


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
            "name": "execute_python",
            "description": "Execute Python code for calculations, data analysis, or processing. Returns stdout and stderr. Do not use for anything harmful.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "Valid Python 3 code to execute",
                    }
                },
                "required": ["code"],
            },
        },
    },
]


TOOL_REGISTRY = {
    "web_search": web_search,
    "read_url": read_url,
    "execute_python": execute_python,
}


def run_tool(name: str, args: dict) -> str:
    fn = TOOL_REGISTRY.get(name)
    if not fn:
        return json.dumps({"error": f"Unknown tool: {name}"})
    result = fn(**args)
    return json.dumps(result, ensure_ascii=False)
