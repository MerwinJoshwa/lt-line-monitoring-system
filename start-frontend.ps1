# Start Frontend Development Server
Write-Host "Starting Python IDE Frontend..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>&1
    Write-Host "Found Node.js: $nodeVersion" -ForegroundColor Blue
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js 16+ from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version 2>&1
    Write-Host "Found npm: $npmVersion" -ForegroundColor Blue
} catch {
    Write-Host "Error: npm is not installed" -ForegroundColor Red
    exit 1
}

# Navigate to frontend directory
Set-Location -Path "frontend"

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "Dependencies already installed" -ForegroundColor Blue
}

Write-Host "Starting React development server on http://localhost:3000" -ForegroundColor Green
Write-Host "The application will automatically open in your browser" -ForegroundColor Cyan
npm start
