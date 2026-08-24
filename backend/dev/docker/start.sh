#!/bin/bash

export PATH=$PATH:/go/bin

TMP_DIR=/app/tmp
mkdir -p "$TMP_DIR"

DEBUG_LOWER=$(grep -i "^DEBUG=" .env | cut -d '=' -f2 | tr '[:upper:]' '[:lower:]')
DEBUG_FILE="$TMP_DIR/.debug_state"

if [ -f "$DEBUG_FILE" ]; then
  PREV_DEBUG=$(cat "$DEBUG_FILE")
else
  PREV_DEBUG=""
fi

echo "$DEBUG_LOWER" > "$DEBUG_FILE"

if [[ "$PREV_DEBUG" != "$DEBUG_LOWER" ]]; then
  echo "🔁 DEBUG has changed '$PREV_DEBUG' to '$DEBUG_LOWER'"
fi

if [[ "$DEBUG_LOWER" == "true" ]]; then
go mod tidy
echo "🐞 DEBUG=Enabled!"
dlv debug ./cmd/http/main.go --headless --listen=:40000 --api-version=2 --accept-multiclient --log --output "$TMP_DIR/__debug_bin"

else
  exec go run ./cmd/http
fi
