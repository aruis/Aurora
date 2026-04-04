@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

set "APP_DIR=%ROOT_DIR%app"
set "CONFIG_DIR=%ROOT_DIR%config"
set "DATA_DIR=%ROOT_DIR%data"
set "BACKUP_DIR=%DATA_DIR%\backup"
set "LOG_DIR=%ROOT_DIR%logs"
set "RUN_DIR=%ROOT_DIR%run"
set "PID_FILE=%RUN_DIR%\aurora.pid"
set "JAVA_EXE=%APP_DIR%\runtime\bin\java.exe"
set "JAR_FILE=%APP_DIR%\aurora.jar"
set "PORT=8080"
set "ACCESS_URL=http://localhost:%PORT%"
set "STARTED_PID="

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
if not exist "%RUN_DIR%" mkdir "%RUN_DIR%"

if exist "%PID_FILE%" (
  set /p EXISTING_PID=<"%PID_FILE%"
  if not "!EXISTING_PID!"=="" (
    tasklist /FI "PID eq !EXISTING_PID!" | findstr /R /C:" !EXISTING_PID! " >nul 2>&1
    if not errorlevel 1 (
      echo Aurora is already running. PID: !EXISTING_PID!
      echo Access URL: %ACCESS_URL%
      pause
      exit /b 0
    )
  )
)

netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo Port %PORT% is already in use. Please free the port and try again.
  pause
  exit /b 1
)

if not exist "%JAR_FILE%" (
  echo Missing file: %JAR_FILE%
  echo Please rebuild the Windows portable package and try again.
  pause
  exit /b 1
)

if not exist "%JAVA_EXE%" (
  set "JAVA_EXE=java"
  where java >nul 2>&1
  if errorlevel 1 (
    echo No bundled Java runtime found, and no system Java is available.
    echo Put a Windows Java runtime under app\runtime\ and try again.
    pause
    exit /b 1
  )
)

echo Starting Aurora, please wait...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$workDir = (Resolve-Path '.').Path; " ^
  "$javaExe = '%JAVA_EXE%'; " ^
  "$jarFile = '%JAR_FILE%'; " ^
  "$outLog = Join-Path $workDir 'logs\\aurora-console.log'; " ^
  "$errLog = Join-Path $workDir 'logs\\aurora-error.log'; " ^
  "$args = @('-Dfile.encoding=UTF-8', '-jar', $jarFile, '--spring.config.additional-location=file:./config/'); " ^
  "$process = Start-Process -FilePath $javaExe -ArgumentList $args -WorkingDirectory $workDir -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru -WindowStyle Hidden; " ^
  "Set-Content -Path '%PID_FILE%' -Value $process.Id -Encoding ascii"

if errorlevel 1 (
  echo Start command failed. Check logs\aurora-console.log and logs\aurora-error.log.
  pause
  exit /b 1
)

if exist "%PID_FILE%" (
  set /p STARTED_PID=<"%PID_FILE%"
)

if "%STARTED_PID%"=="" (
  echo Aurora did not return a PID. Check logs\aurora-console.log and logs\aurora-error.log.
  pause
  exit /b 1
)

set "WAIT_SECONDS=20"
for /L %%i in (1,1,%WAIT_SECONDS%) do (
  tasklist /FI "PID eq %STARTED_PID%" | findstr /R /C:" %STARTED_PID% " >nul 2>&1
  if errorlevel 1 (
    echo Aurora exited early. Check logs\aurora-console.log and logs\aurora-error.log.
    if exist "%PID_FILE%" del "%PID_FILE%" >nul 2>&1
    pause
    exit /b 1
  )

  netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>&1
  if not errorlevel 1 goto started

  powershell -NoProfile -Command "Start-Sleep -Seconds 1" >nul
)

echo Aurora process started, but port %PORT% is not ready yet.
echo It may still be starting. If the page does not open soon, check logs\aurora-console.log and logs\aurora-error.log.
echo PID: %STARTED_PID%
echo Access URL: %ACCESS_URL%
echo Log directory: %LOG_DIR%
pause
exit /b 0

:started
echo Aurora is running.
echo PID: %STARTED_PID%
echo Access URL: %ACCESS_URL%
echo Log directory: %LOG_DIR%
echo Use the stop script in this folder to stop Aurora.
pause
