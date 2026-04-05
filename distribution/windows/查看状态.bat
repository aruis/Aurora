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
    tasklist /FI "PID eq !TARGET_PID!" | findstr /R /C:" !TARGET_PID! " >nul 2>&1
    if not errorlevel 1 (
      echo Aurora is running.
      echo PID: !TARGET_PID!
      echo Access URL: http://localhost:%PORT%
      call :maybe_pause
      exit /b 0
    )
  )
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  echo Aurora is running.
  echo PID: %%p
  echo Access URL: http://localhost:%PORT%
  call :maybe_pause
  exit /b 0
)

echo Aurora is not running.
call :maybe_pause
exit /b 0

:maybe_pause
if defined AURORA_NO_PAUSE exit /b 0
pause
exit /b 0
