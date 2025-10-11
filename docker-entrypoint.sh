#!/bin/sh
set -e

CONFIG_FILE="${JSFLARE_CONFIG:-/config/config.jsonc}"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Config file not found at $CONFIG_FILE"
  exit 1
fi

echo "✅ Running jsflare with config: $CONFIG_FILE"
node dist/index.js --config "$CONFIG_FILE"
