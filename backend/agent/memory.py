"""
Short-term memory: per-session conversation history (in-memory dict).
Long-term memory: ChromaDB for past research summaries, searchable by embedding.
"""

import json
import os
from datetime import datetime
from typing import Optional
import chromadb
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction

_sessions: dict[str, list[dict]] = {}

_chroma_client: Optional[chromadb.ClientAPI] = None
_collection = None


def _get_collection():
    global _chroma_client, _collection
    if _collection is None:
        _chroma_client = chromadb.PersistentClient(path="./chroma_data")
        ef = OpenAIEmbeddingFunction(
            api_key=os.getenv("OPENAI_API_KEY"),
            model_name="text-embedding-3-small",
        )
        _collection = _chroma_client.get_or_create_collection(
            name="research_memory",
            embedding_function=ef,
        )
    return _collection


# --- Short-term (session) memory ---

def get_history(session_id: str) -> list[dict]:
    return _sessions.get(session_id, [])


def add_message(session_id: str, role: str, content: str):
    if session_id not in _sessions:
        _sessions[session_id] = []
    _sessions[session_id].append({"role": role, "content": content})
    # Keep last 40 messages to stay within context limits
    if len(_sessions[session_id]) > 40:
        _sessions[session_id] = _sessions[session_id][-40:]


def clear_session(session_id: str):
    _sessions.pop(session_id, None)


# --- Long-term (cross-session) memory ---

def save_research(session_id: str, query: str, summary: str):
    """Persist a research summary to ChromaDB for future recall."""
    try:
        col = _get_collection()
        doc_id = f"{session_id}_{datetime.utcnow().isoformat()}"
        col.add(
            ids=[doc_id],
            documents=[summary],
            metadatas=[{"query": query, "session_id": session_id, "timestamp": datetime.utcnow().isoformat()}],
        )
    except Exception:
        pass


def list_memories(session_id: Optional[str] = None) -> list[dict]:
    """List stored long-term memories, optionally filtered to one session — makes the agent's memory inspectable."""
    try:
        col = _get_collection()
        where = {"session_id": session_id} if session_id else None
        results = col.get(where=where) if where else col.get()
        items = []
        for doc_id, doc, meta in zip(results.get("ids", []), results.get("documents", []), results.get("metadatas", [])):
            items.append({
                "id": doc_id,
                "summary": doc,
                "original_query": meta.get("query", ""),
                "session_id": meta.get("session_id", ""),
                "timestamp": meta.get("timestamp", ""),
            })
        items.sort(key=lambda m: m["timestamp"], reverse=True)
        return items
    except Exception:
        return []


def delete_memory(memory_id: str) -> bool:
    try:
        col = _get_collection()
        col.delete(ids=[memory_id])
        return True
    except Exception:
        return False


def search_memory(query: str, n_results: int = 3) -> list[dict]:
    """Search past research for relevant context."""
    try:
        col = _get_collection()
        if col.count() == 0:
            return []
        results = col.query(query_texts=[query], n_results=min(n_results, col.count()))
        items = []
        for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
            items.append({"summary": doc[:400], "original_query": meta.get("query", ""), "timestamp": meta.get("timestamp", "")})
        return items
    except Exception:
        return []
