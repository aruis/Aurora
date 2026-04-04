#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$ROOT_DIR/run/aurora.pid"
PORT=8080

stop_pid() {
  local pid="${1:-}"
  [[ -z "$pid" ]] && return 1
  if kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    return 0
  fi
  return 1
}

if [[ -f "$PID_FILE" ]]; then
  TARGET_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if stop_pid "$TARGET_PID"; then
    rm -f "$PID_FILE"
    echo "Aurora 已停止，PID: $TARGET_PID"
    exit 0
  fi
fi

PORT_PID="$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null | head -n 1 || true)"
if stop_pid "$PORT_PID"; then
  rm -f "$PID_FILE"
  echo "Aurora 已停止，PID: $PORT_PID"
  exit 0
fi

echo "未发现正在运行的 Aurora 进程。"
