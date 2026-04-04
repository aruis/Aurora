#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$ROOT_DIR/data"
DB_FILE="$DATA_DIR/aurora.db"
BACKUP_DIR="$DATA_DIR/backup"
PID_FILE="$ROOT_DIR/run/aurora.pid"

mkdir -p "$BACKUP_DIR"

if [[ -f "$PID_FILE" ]]; then
  TARGET_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "$TARGET_PID" ]] && kill -0 "$TARGET_PID" >/dev/null 2>&1; then
    echo "检测到 Aurora 正在运行。"
    echo "请先执行 ./stop-aurora.command 后再备份数据库。"
    exit 1
  fi
fi

if [[ ! -f "$DB_FILE" ]]; then
  echo "未找到数据库文件：$DB_FILE"
  echo "如果是首次使用，请先启动一次系统生成数据库。"
  exit 1
fi

STAMP="$(date '+%Y%m%d-%H%M%S')"
TARGET_FILE="$BACKUP_DIR/aurora-$STAMP.db"
cp "$DB_FILE" "$TARGET_FILE"
echo "备份完成：$TARGET_FILE"
