@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

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
      echo 检测到 Aurora 正在运行。
      echo 为了避免备份中的数据库不完整，请先执行 “停止 Aurora.bat”。
      pause
      exit /b 1
    )
  )
)

if not exist "%DB_FILE%" (
  echo 未找到数据库文件：%DB_FILE%
  echo 如果是首次使用，先启动一次系统生成数据库后再备份。
  pause
  exit /b 1
)

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%i"
set "TARGET_FILE=%BACKUP_DIR%\aurora-%STAMP%.db"

copy /Y "%DB_FILE%" "%TARGET_FILE%" >nul
if errorlevel 1 (
  echo 备份失败，请检查磁盘空间或目录权限。
  pause
  exit /b 1
)

echo 备份完成：
echo %TARGET_FILE%
pause
