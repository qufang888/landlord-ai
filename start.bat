@echo off
cd /d "%~dp0"
title Yipai AI

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

echo Starting Vite dev server...
start /min cmd /c "npm run dev"

timeout /t 4 /nobreak >nul

echo Opening Electron window...
set VITE_DEV_SERVER_URL=http://localhost:5173/
npx electron .

echo.
echo Electron closed.
pause
