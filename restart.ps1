# Restart script for AWS & Azure to GCP Migration Accelerator (PowerShell)
# This script stops any running instance and starts a fresh development server

Write-Host "🔄 Restarting Migration Accelerator..." -ForegroundColor Cyan
Write-Host ""

# Get the directory where the script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Function to kill process on port 3000
function Stop-Port3000 {
    Write-Host "🛑 Stopping any existing server on port 3000..." -ForegroundColor Yellow
    
    try {
        # Find process using port 3000
        $process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | 
                   Select-Object -ExpandProperty OwningProcess -First 1
        
        if ($process) {
            Write-Host "   Found process $process on port 3000, stopping it..." -ForegroundColor Yellow
            Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
            Write-Host "   ✅ Port 3000 is now free" -ForegroundColor Green
        } else {
            Write-Host "   ℹ️  No process found on port 3000" -ForegroundColor Gray
        }
    } catch {
        Write-Host "   ℹ️  No process found on port 3000" -ForegroundColor Gray
    }
}

# Function to check if node_modules exists
function Check-Dependencies {
    if (-not (Test-Path "node_modules")) {
        Write-Host "⚠️  node_modules not found. Installing dependencies..." -ForegroundColor Yellow
        npm install
        Write-Host ""
    }
}

# Function to start the server
function Start-DevServer {
    Write-Host ""
    Write-Host "🚀 Starting development server..." -ForegroundColor Green
    Write-Host "   Server will be available at: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Gray
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
    
    # Start the server
    npm start
}

# Main execution
Stop-Port3000
Check-Dependencies
Start-DevServer
