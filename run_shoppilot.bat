@echo off
start "ShopPilot API" /D "%~dp0" cmd /k python backend\app.py
start "ShopPilot UI" /D "%~dp0frontend" cmd /k npm run dev
timeout /t 4 /nobreak >nul
start "" http://127.0.0.1:5173
