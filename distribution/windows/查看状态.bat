@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

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
      echo Aurora 正在运行。
      echo PID: !TARGET_PID!
      echo 地址: http://localhost:%PORT%
      pause
      exit /b 0
    )
  )
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  echo Aurora 正在运行。
  echo PID: %%p
  echo 地址: http://localhost:%PORT%
  pause
  exit /b 0
)

echo Aurora 当前未运行。
pause
