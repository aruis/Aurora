@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

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

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
if not exist "%RUN_DIR%" mkdir "%RUN_DIR%"

if exist "%PID_FILE%" (
  set /p EXISTING_PID=<"%PID_FILE%"
  if not "!EXISTING_PID!"=="" (
    tasklist /FI "PID eq !EXISTING_PID!" | findstr /R /C:" !EXISTING_PID! " >nul 2>&1
    if not errorlevel 1 (
      echo Aurora 已在运行中，PID: !EXISTING_PID!
      echo 访问地址: http://localhost:%PORT%
      pause
      exit /b 0
    )
  )
)

netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo 端口 %PORT% 已被其他程序占用，请先释放该端口后重试。
  pause
  exit /b 1
)

if not exist "%JAR_FILE%" (
  echo 未找到 %JAR_FILE%
  echo 请先执行 Windows 绿色包打包流程，再重试。
  pause
  exit /b 1
)

if not exist "%JAVA_EXE%" (
  set "JAVA_EXE=java"
  where java >nul 2>&1
  if errorlevel 1 (
    echo 未找到内置 Java 运行时，也没有检测到系统 Java。
    echo 建议将 Windows JRE 解压到 app\runtime\ 目录后再启动。
    pause
    exit /b 1
  )
)

echo 正在启动 Aurora，请稍候...
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
  echo 启动失败，请检查 logs\aurora-console.log 和 logs\aurora-error.log。
  pause
  exit /b 1
)

echo Aurora 已启动。
echo 访问地址: http://localhost:%PORT%
echo 日志目录: %LOG_DIR%
echo 如需停止，请双击 “停止 Aurora.bat”。
pause
