#!/bin/bash

# Restart script for AWS & Azure to GCP Migration Accelerator
# This script stops any running instance and starts a fresh development server

set -e  # Exit on error

echo "🔄 Restarting Migration Accelerator..."
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to kill process on port 3000
kill_port_3000() {
  echo "🛑 Stopping any existing server on port 3000..."
  
  # Find and kill process on port 3000
  PID=$(lsof -ti:3000 2>/dev/null || true)
  
  if [ -n "$PID" ]; then
    echo "   Found process $PID on port 3000, killing it..."
    kill -9 "$PID" 2>/dev/null || true
    sleep 1
    echo "   ✅ Port 3000 is now free"
  else
    echo "   ℹ️  No process found on port 3000"
  fi
}

# Function to check if node_modules exists
check_dependencies() {
  if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Installing dependencies..."
    npm install
    echo ""
  fi
}

# Function to start the server
start_server() {
  echo ""
  echo "🚀 Starting development server..."
  echo "   Server will be available at: http://localhost:3000"
  echo ""
  echo "   Press Ctrl+C to stop the server"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # Start the server
  npm start
}

# Main execution
main() {
  kill_port_3000
  check_dependencies
  start_server
}

# Run main function
main
