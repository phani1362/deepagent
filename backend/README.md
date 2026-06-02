---
title: DeepAgent Backend
emoji: 🤖
colorFrom: purple
colorTo: indigo
sdk: docker
pinned: false
app_port: 7860
---

# DeepAgent Backend API

FastAPI backend for the DeepAgent autonomous research assistant.

## Endpoints
- `POST /api/chat` — streaming SSE agent endpoint
- `POST /api/session` — create a session
- `GET /api/history/{session_id}` — get chat history
