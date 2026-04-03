#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/web"

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

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  local exit_code=$?

  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi

  wait >/dev/null 2>&1 || true
  exit "$exit_code"
}

trap cleanup INT TERM EXIT

echo "[backend] 启动 Spring Boot: http://localhost:8080"
(cd "$ROOT_DIR" && ./gradlew bootRun) &
BACKEND_PID=$!

echo "[frontend] 启动 Vite: http://localhost:5173"
(cd "$WEB_DIR" && pnpm dev --host 0.0.0.0) &
FRONTEND_PID=$!

echo "Aurora 本地开发环境已启动。按 Ctrl+C 可同时关闭前后端。"

wait -n "$BACKEND_PID" "$FRONTEND_PID"
