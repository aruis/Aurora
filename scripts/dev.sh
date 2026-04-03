#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/web"
RUN_DIR="$ROOT_DIR/.run"
PID_FILE="$RUN_DIR/dev-server.pids"
COMMAND="${1:-on}"

mkdir -p "$RUN_DIR"

read_pids() {
  if [[ -f "$PID_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$PID_FILE"
  else
    BACKEND_PID=""
    FRONTEND_PID=""
  fi
}

write_pids() {
  cat >"$PID_FILE" <<EOF
BACKEND_PID=$BACKEND_PID
FRONTEND_PID=$FRONTEND_PID
EOF
}

remove_pids() {
  rm -f "$PID_FILE"
}

stop_pid() {
  local pid="$1"
  local name="$2"

  if [[ -z "$pid" ]]; then
    return
  fi

  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "[$name] 停止进程 $pid"
    kill "$pid" >/dev/null 2>&1 || true
    wait "$pid" >/dev/null 2>&1 || true
  fi
}

stop_services() {
  read_pids

  if [[ -z "${BACKEND_PID:-}" && -z "${FRONTEND_PID:-}" ]]; then
    echo "未发现运行中的本地前后端进程。"
    remove_pids
    return
  fi

  stop_pid "${FRONTEND_PID:-}" "frontend"
  stop_pid "${BACKEND_PID:-}" "backend"
  remove_pids
  echo "Aurora 本地开发进程已停止。"
}

status_services() {
  read_pids

  local backend_status="stopped"
  local frontend_status="stopped"

  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    backend_status="running ($BACKEND_PID)"
  fi

  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
    frontend_status="running ($FRONTEND_PID)"
  fi

  echo "backend: $backend_status"
  echo "frontend: $frontend_status"
}

case "$COMMAND" in
  off)
    stop_services
    exit 0
    ;;
  status)
    status_services
    exit 0
    ;;
  on)
    ;;
  *)
    echo "用法: ./scripts/dev.sh [on|off|status]"
    exit 1
    ;;
esac

if ! command -v java >/dev/null 2>&1; then
  echo "java 未安装，无法启动后端。"
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm 未安装，无法启动前端。"
  exit 1
fi

if [[ ! -d "$WEB_DIR/node_modules" ]]; then
  echo "[setup] 安装前端依赖..."
  (cd "$WEB_DIR" && pnpm install)
fi

read_pids

if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
  echo "后端已经在运行中: $BACKEND_PID"
  exit 1
fi

if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
  echo "前端已经在运行中: $FRONTEND_PID"
  exit 1
fi

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  local exit_code=$?
  stop_pid "$FRONTEND_PID" "frontend"
  stop_pid "$BACKEND_PID" "backend"
  remove_pids
  exit "$exit_code"
}

trap cleanup INT TERM EXIT

echo "[backend] 启动 Spring Boot: http://localhost:8080"
(cd "$ROOT_DIR" && ./gradlew bootRun) &
BACKEND_PID=$!

echo "[frontend] 启动 Vite: http://localhost:5173"
(cd "$WEB_DIR" && pnpm dev --host 0.0.0.0) &
FRONTEND_PID=$!
write_pids

echo "Aurora 本地开发环境已启动。"
echo "关闭命令: ./scripts/dev.sh off"
echo "状态查看: ./scripts/dev.sh status"

wait -n "$BACKEND_PID" "$FRONTEND_PID"
