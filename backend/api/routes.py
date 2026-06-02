import json
import uuid
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from agent.core import run_agent
from agent.memory import get_history, clear_session

router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str


class SessionResponse(BaseModel):
    session_id: str


@router.post("/session")
async def create_session() -> SessionResponse:
    return SessionResponse(session_id=str(uuid.uuid4()))


@router.get("/history/{session_id}")
async def get_chat_history(session_id: str):
    return {"session_id": session_id, "messages": get_history(session_id)}


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    clear_session(session_id)
    return {"status": "cleared"}


@router.post("/chat")
async def chat(req: ChatRequest):
    session_id = req.session_id or str(uuid.uuid4())

    async def event_stream():
        # Send session_id first so client can track it
        yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id})}\n\n"

        async for event in run_agent(session_id, req.message):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
