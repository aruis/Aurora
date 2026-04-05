#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$ROOT_DIR/run/aurora.pid"
PORT=51880

is_running() {
  local pid="${1:-}"
  [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1
}

if [[ -f "$PID_FILE" ]]; then
  TARGET_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if is_running "$TARGET_PID"; then
    echo "Aurora 正在运行。"
    echo "PID: $TARGET_PID"
    echo "地址: http://localhost:$PORT"
    exit 0
  fi
fi

PORT_PID="$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null | head -n 1 || true)"
if [[ -n "$PORT_PID" ]]; then
  echo "Aurora 正在运行。"
  echo "PID: $PORT_PID"
  echo "地址: http://localhost:$PORT"
  exit 0
fi

echo "Aurora 当前未运行。"
