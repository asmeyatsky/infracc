#!/bin/bash

# Stop script for InfraCC - Stops both frontend and backend servers

echo "🛑 Stopping InfraCC servers..."

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Stop backend
if [ -f backend.pid ]; then
  BACKEND_PID=$(cat backend.pid)
  if ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "   Stopping backend server (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || true
    rm backend.pid
    echo "   ✅ Backend stopped"
  else
    rm backend.pid
  fi
fi

# Stop processes on ports
for PORT in 3000 3001; do
  PID=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo "   Stopping process on port $PORT (PID: $PID)..."
    kill -9 "$PID" 2>/dev/null || true
    echo "   ✅ Port $PORT freed"
  fi
done

echo "✅ All servers stopped"
