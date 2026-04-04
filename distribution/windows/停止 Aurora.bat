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
    taskkill /PID !TARGET_PID! /T /F >nul 2>&1
    if not errorlevel 1 (
      del "%PID_FILE%" >nul 2>&1
      echo Aurora 已停止，PID: !TARGET_PID!
      pause
      exit /b 0
    )
  )
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  taskkill /PID %%p /T /F >nul 2>&1
  if not errorlevel 1 (
    if exist "%PID_FILE%" del "%PID_FILE%" >nul 2>&1
    echo Aurora 已停止，PID: %%p
    pause
    exit /b 0
  )
)

echo 未发现正在运行的 Aurora 进程。
pause
