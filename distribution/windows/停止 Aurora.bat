@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

set "CONFIG_FILE=%ROOT_DIR%config\application.yaml"
set "RUN_DIR=%ROOT_DIR%run"
set "PID_FILE=%RUN_DIR%\aurora.pid"
set "PORT="

if not exist "%CONFIG_FILE%" (
  echo Missing config file: %CONFIG_FILE%
  call :maybe_pause
  exit /b 1
)

for /f "tokens=2 delims=:" %%p in ('findstr /R /B /C:"  port:" "%CONFIG_FILE%"') do set "PORT_RAW=%%p"
set "PORT=%PORT_RAW: =%"
if "%PORT%"=="" (
  echo Could not read server.port from %CONFIG_FILE%
  call :maybe_pause
  exit /b 1
)

if exist "%PID_FILE%" (
  set /p TARGET_PID=<"%PID_FILE%"
  if not "!TARGET_PID!"=="" (
    taskkill /PID !TARGET_PID! /T /F >nul 2>&1
    if not errorlevel 1 (
      del "%PID_FILE%" >nul 2>&1
      echo Aurora stopped. PID: !TARGET_PID!
      call :maybe_pause
      exit /b 0
    )
  )
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  taskkill /PID %%p /T /F >nul 2>&1
  if not errorlevel 1 (
    if exist "%PID_FILE%" del "%PID_FILE%" >nul 2>&1
    echo Aurora stopped. PID: %%p
    call :maybe_pause
    exit /b 0
  )
)

echo No running Aurora process was found.
call :maybe_pause
exit /b 0

:maybe_pause
if defined AURORA_NO_PAUSE exit /b 0
pause
exit /b 0
