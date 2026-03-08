#!/usr/bin/env sh
set -eu

ICON_PATH="$(dirname "$0")/../src-tauri/icons/icon.png"

if [ ! -f "$ICON_PATH" ]; then
  echo "Icon check failed: $ICON_PATH not found" >&2
  exit 1
fi

FILE_INFO="$(file "$ICON_PATH")"

case "$FILE_INFO" in
  *"PNG image data"*"RGBA"*)
    echo "Icon check passed: $FILE_INFO"
    ;;
  *)
    echo "Icon check failed: expected RGBA PNG at $ICON_PATH" >&2
    echo "Actual: $FILE_INFO" >&2
    exit 1
    ;;
esac
