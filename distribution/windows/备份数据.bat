@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

set "DATA_DIR=%ROOT_DIR%data"
set "DB_FILE=%DATA_DIR%\aurora.db"
set "BACKUP_DIR=%DATA_DIR%\backup"
set "RUN_DIR=%ROOT_DIR%run"
set "PID_FILE=%RUN_DIR%\aurora.pid"

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

if exist "%PID_FILE%" (
  set /p TARGET_PID=<"%PID_FILE%"
  if not "!TARGET_PID!"=="" (
    tasklist /FI "PID eq !TARGET_PID!" | findstr /R /C:" !TARGET_PID! " >nul 2>&1
    if not errorlevel 1 (
      echo Aurora is running.
      echo Stop Aurora before backup to avoid an incomplete database copy.
      call :maybe_pause
      exit /b 1
    )
  )
)

if not exist "%DB_FILE%" (
  echo Database file not found: %DB_FILE%
  echo Start Aurora once to create the database, then run backup again.
  call :maybe_pause
  exit /b 1
)

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%i"
set "TARGET_FILE=%BACKUP_DIR%\aurora-%STAMP%.db"

copy /Y "%DB_FILE%" "%TARGET_FILE%" >nul
if errorlevel 1 (
  echo Backup failed. Check disk space and folder permissions.
  call :maybe_pause
  exit /b 1
)

echo Backup completed:
echo %TARGET_FILE%
call :maybe_pause
exit /b 0

:maybe_pause
if defined AURORA_NO_PAUSE exit /b 0
pause
exit /b 0
