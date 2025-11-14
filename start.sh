#!/bin/bash

# Startup script for InfraCC - Starts both frontend and backend servers
# This script starts the backend API proxy and the frontend React app

set -e  # Exit on error

echo "🚀 Starting InfraCC Application..."
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to kill process on a port
kill_port() {
  local PORT=$1
  local NAME=$2
  echo "🛑 Checking port $PORT ($NAME)..."
  
  PID=$(lsof -ti:$PORT 2>/dev/null || true)
  
  if [ -n "$PID" ]; then
    echo "   Found process $PID on port $PORT, stopping it..."
    kill -9 "$PID" 2>/dev/null || true
    sleep 1
    echo "   ✅ Port $PORT is now free"
  else
    echo "   ℹ️  Port $PORT is free"
  fi
}

# Function to check backend dependencies
check_backend_dependencies() {
  if [ ! -d "backend/node_modules" ]; then
    echo "⚠️  Backend dependencies not found. Installing..."
    cd backend
    npm install
    cd ..
    echo ""
  fi
}

# Function to check frontend dependencies
check_frontend_dependencies() {
  if [ ! -d "node_modules" ]; then
    echo "⚠️  Frontend dependencies not found. Installing..."
    npm install
    echo ""
  fi
}

# Function to start backend server
start_backend() {
  echo ""
  echo "🔧 Starting backend server (port 3001)..."
  cd backend
  
  # Start backend in background
  npm start > ../backend.log 2>&1 &
  BACKEND_PID=$!
  echo $BACKEND_PID > ../backend.pid
  cd ..
  
  # Wait a moment for backend to start
  sleep 2
  
  # Check if backend is running
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "   ✅ Backend server is running on http://localhost:3001"
  else
    echo "   ⚠️  Backend server may still be starting..."
  fi
  echo ""
}

# Function to start frontend server
start_frontend() {
  echo ""
  echo "🎨 Starting frontend server (port 3000)..."
  echo "   Frontend will be available at: http://localhost:3000"
  echo "   Backend API is available at: http://localhost:3001"
  echo ""
  echo "   Press Ctrl+C to stop both servers"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # Start frontend (this will block)
  npm start
}

# Cleanup function
cleanup() {
  echo ""
  echo "🛑 Stopping servers..."
  
  # Stop backend
  if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
      kill $BACKEND_PID 2>/dev/null || true
    fi
    rm backend.pid
  fi
  
  # Stop frontend (already stopped by Ctrl+C)
  kill_port 3000 "Frontend"
  kill_port 3001 "Backend"
  
  echo "✅ Servers stopped"
  exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Main execution
main() {
  kill_port 3000 "Frontend"
  kill_port 3001 "Backend"
  check_backend_dependencies
  check_frontend_dependencies
  start_backend
  start_frontend
}

# Run main function
main
