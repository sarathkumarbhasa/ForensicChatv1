@echo off
echo Starting ForensicChat Dev Servers...

REM Start the backend server in a new window
start "ForensicChat - Backend Server" cmd /k "cd backend && python main.py"

REM Start the frontend server in a new window
start "ForensicChat - Frontend UI" cmd /k "npm run dev"

echo Servers are launching...
exit
