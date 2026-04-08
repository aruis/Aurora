#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/web"
RUN_DIR="$ROOT_DIR/.run"
PID_FILE="$RUN_DIR/dev-server.pids"
COMMAND="${1:-on}"

mkdir -p "$RUN_DIR"

is_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1
}

port_pid() {
  local port="$1"
  lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -n 1
}

parent_pid() {
  local pid="$1"
  if [[ -z "$pid" ]]; then
    return 0
  fi
  ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' '
}

discover_backend_pid() {
  local pid=""

  pid="$(port_pid 51889)"
  if [[ -n "$pid" ]]; then
    echo "$pid"
    return
  fi

  pgrep -f "${ROOT_DIR}/build/classes/java/main|net\\.ximatai\\.aurora\\.AuroraApplication|gradle-wrapper\\.jar bootRun" | head -n 1
}

discover_frontend_pid() {
  local pid=""

  pid="$(port_pid 5173)"
  if [[ -n "$pid" ]]; then
    echo "$pid"
    return
  fi

  pgrep -f "${WEB_DIR}/node_modules/.bin/.*/vite/bin/vite\\.js --host 0\\.0\\.0\\.0" | head -n 1
}

collect_service_pids() {
  local backend_pid frontend_pid frontend_parent backend_parent

  backend_pid="$(discover_backend_pid || true)"
  frontend_pid="$(discover_frontend_pid || true)"
  backend_parent="$(parent_pid "$backend_pid")"
  frontend_parent="$(parent_pid "$frontend_pid")"

  {
    [[ -n "$FRONTEND_PID" ]] && echo "$FRONTEND_PID"
    [[ -n "$frontend_pid" ]] && echo "$frontend_pid"
    [[ -n "$frontend_parent" ]] && ps -o command= -p "$frontend_parent" 2>/dev/null | grep -q "pnpm dev --host 0.0.0.0" && echo "$frontend_parent"
    [[ -n "$BACKEND_PID" ]] && echo "$BACKEND_PID"
    [[ -n "$backend_pid" ]] && echo "$backend_pid"
    [[ -n "$backend_parent" ]] && ps -o command= -p "$backend_parent" 2>/dev/null | grep -q "gradle-wrapper.jar bootRun" && echo "$backend_parent"
    pgrep -f "${WEB_DIR}/node_modules/.bin/.*/vite/bin/vite\\.js --host 0\\.0\\.0\\.0" || true
    pgrep -f "${ROOT_DIR}/build/classes/java/main|net\\.ximatai\\.aurora\\.AuroraApplication|gradle-wrapper\\.jar bootRun" || true
  } | awk 'NF' | sort -u
}

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

resolve_pids() {
  read_pids

  if ! is_running "${BACKEND_PID:-}"; then
    BACKEND_PID="$(discover_backend_pid || true)"
  fi

  if ! is_running "${FRONTEND_PID:-}"; then
    FRONTEND_PID="$(discover_frontend_pid || true)"
  fi
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
  resolve_pids
  local pids=()
  while IFS= read -r pid; do
    pids+=("$pid")
  done < <(collect_service_pids)

  if [[ ${#pids[@]} -eq 0 ]]; then
    echo "未发现运行中的本地前后端进程。"
    remove_pids
    return
  fi

  for pid in "${pids[@]}"; do
    if [[ "$pid" == "${FRONTEND_PID:-}" || "$pid" == "$(discover_frontend_pid || true)" ]]; then
      stop_pid "$pid" "frontend"
    elif [[ "$pid" == "${BACKEND_PID:-}" || "$pid" == "$(discover_backend_pid || true)" ]]; then
      stop_pid "$pid" "backend"
    else
      stop_pid "$pid" "dev"
    fi
  done
  remove_pids
  echo "Aurora 本地开发进程已停止。"
}

status_services() {
  resolve_pids

  local backend_status="stopped"
  local frontend_status="stopped"

  if is_running "${BACKEND_PID:-}"; then
    backend_status="running ($BACKEND_PID)"
  fi

  if is_running "${FRONTEND_PID:-}"; then
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

resolve_pids

backend_already_running=false
frontend_already_running=false
started_backend=false
started_frontend=false

if is_running "${BACKEND_PID:-}"; then
  backend_already_running=true
  echo "后端已经在运行中: $BACKEND_PID"
else
  BACKEND_PID=""
fi

if is_running "${FRONTEND_PID:-}"; then
  frontend_already_running=true
  echo "前端已经在运行中: $FRONTEND_PID"
else
  FRONTEND_PID=""
fi

if [[ "$backend_already_running" == true && "$frontend_already_running" == true ]]; then
  echo "Aurora 本地开发环境已在运行。"
  write_pids
  exit 0
fi

cleanup() {
  local exit_code=$?
  if [[ "$started_frontend" == true ]]; then
    stop_pid "$FRONTEND_PID" "frontend"
  fi
  if [[ "$started_backend" == true ]]; then
    stop_pid "$BACKEND_PID" "backend"
  fi
  remove_pids
  exit "$exit_code"
}

trap cleanup INT TERM EXIT

if [[ "$backend_already_running" != true ]]; then
  echo "[backend] 启动 Spring Boot: http://localhost:51889"
  (cd "$ROOT_DIR" && ./gradlew bootRun) &
  BACKEND_PID=$!
  started_backend=true
fi

if [[ "$frontend_already_running" != true ]]; then
  echo "[frontend] 启动 Vite: http://localhost:5173"
  (cd "$WEB_DIR" && pnpm dev --host 0.0.0.0) &
  FRONTEND_PID=$!
  started_frontend=true
fi
write_pids

echo "Aurora 本地开发环境已启动。"
echo "关闭命令: ./scripts/dev.sh off"
echo "状态查看: ./scripts/dev.sh status"

wait_for_pid() {
  local pid="$1"
  if [[ -n "$pid" ]]; then
    wait "$pid"
  fi
}

if [[ "$started_backend" == true && "$started_frontend" == true ]]; then
  while is_running "$BACKEND_PID" && is_running "$FRONTEND_PID"; do
    sleep 1
  done
  if ! is_running "$BACKEND_PID"; then
    wait_for_pid "$BACKEND_PID"
  fi
  if ! is_running "$FRONTEND_PID"; then
    wait_for_pid "$FRONTEND_PID"
  fi
elif [[ "$started_backend" == true ]]; then
  wait_for_pid "$BACKEND_PID"
elif [[ "$started_frontend" == true ]]; then
  wait_for_pid "$FRONTEND_PID"
fi
