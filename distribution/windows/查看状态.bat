@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

set "RUN_DIR=%ROOT_DIR%run"
set "PID_FILE=%RUN_DIR%\aurora.pid"
set "PORT=8080"

if exist "%PID_FILE%" (
  set /p TARGET_PID=<"%PID_FILE%"
  if not "!TARGET_PID!"=="" (
    tasklist /FI "PID eq !TARGET_PID!" | findstr /R /C:" !TARGET_PID! " >nul 2>&1
    if not errorlevel 1 (
      echo Aurora is running.
      echo PID: !TARGET_PID!
      echo Access URL: http://localhost:%PORT%
      pause
      exit /b 0
    )
  )
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  echo Aurora is running.
  echo PID: %%p
  echo Access URL: http://localhost:%PORT%
  pause
  exit /b 0
)

echo Aurora is not running.
pause
