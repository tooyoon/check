@echo off
echo Starting local server on http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.
python -m http.server 3000 2>nul || python -m SimpleHTTPServer 3000 2>nul || (
    echo Python is not installed. Trying with Node.js...
    npx http-server -p 3000 || (
        echo.
        echo ERROR: Neither Python nor Node.js is available.
        echo Please install Python from https://www.python.org
        echo Or install Node.js from https://nodejs.org
        echo.
        pause
    )
)