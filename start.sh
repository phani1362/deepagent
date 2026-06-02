#!/bin/bash
# Start both backend and frontend in parallel

echo "Starting DeepAgent..."

# Backend
cd backend
if [ ! -d "venv" ]; then
  echo "Creating Python venv..."
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
else
  source venv/bin/activate
fi

uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "Backend running at http://localhost:8000 (PID $BACKEND_PID)"

# Frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend running at http://localhost:3000 (PID $FRONTEND_PID)"

echo ""
echo "DeepAgent is ready at http://localhost:3000"
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
