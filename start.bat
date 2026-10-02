@echo off
title PDF Upload and Object CRUD App - Local Server
echo ====================================================================
echo   PDF Upload and Dynamic Object CRUD Application Starter
echo ====================================================================
echo.

:: Check if backend virtual environment exists
if not exist "backend\venv" (
    echo [ERROR] Python virtual environment was not found at: backend\venv
    echo.
    echo Please make sure the backend is installed. If needed, run:
    echo   cd backend
    echo   python -m venv venv
    echo   venv\Scripts\pip install -r requirements.txt
    echo.
    pause
    exit /b
)

:: Launch the main PDF Upload page in the default web browser
echo [INFO] Opening the frontend PDF Upload dashboard...
start "" "index.html"

:: Change directory to backend and run the Flask server using the venv python
echo [INFO] Starting the Flask server on port 5000...
cd backend
venv\Scripts\python.exe app.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Flask server exited unexpectedly or failed to bind to port 5000.
    echo Check if another server instance is already running on port 5000.
    echo.
    pause
)
