#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$ROOT_DIR/app"
DATA_DIR="$ROOT_DIR/data"
BACKUP_DIR="$DATA_DIR/backup"
LOG_DIR="$ROOT_DIR/logs"
RUN_DIR="$ROOT_DIR/run"
PID_FILE="$RUN_DIR/aurora.pid"
JAR_FILE="$APP_DIR/aurora.jar"
JAVA_EXE="$APP_DIR/runtime/bin/java"
PORT=51880

mkdir -p "$DATA_DIR" "$BACKUP_DIR" "$LOG_DIR" "$RUN_DIR"

is_running() {
  local pid="${1:-}"
  [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1
}

if [[ -f "$PID_FILE" ]]; then
  EXISTING_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if is_running "$EXISTING_PID"; then
    echo "Aurora 已在运行中，PID: $EXISTING_PID"
    echo "访问地址: http://localhost:$PORT"
    exit 0
  fi
fi

if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "端口 $PORT 已被其他程序占用，请先释放后再启动。"
  exit 1
fi

if [[ ! -f "$JAR_FILE" ]]; then
  echo "未找到 $JAR_FILE"
  exit 1
fi

if [[ ! -x "$JAVA_EXE" ]]; then
  JAVA_EXE="$(command -v java || true)"
  if [[ -z "$JAVA_EXE" ]]; then
    echo "未找到内置 Java 运行时，也没有检测到系统 Java。"
    echo "建议将 Linux Java 21 运行时解压到 app/runtime/ 目录。"
    exit 1
  fi
fi

echo "正在启动 Aurora，请稍候..."
(
  cd "$ROOT_DIR"
  nohup "$JAVA_EXE" -Dfile.encoding=UTF-8 -jar "$JAR_FILE" \
    --spring.config.additional-location=file:./config/ \
    >"$LOG_DIR/aurora-console.log" 2>"$LOG_DIR/aurora-error.log" &
  echo $! >"$PID_FILE"
)

echo "Aurora 已启动。"
echo "访问地址: http://localhost:$PORT"
echo "日志目录: $LOG_DIR"
