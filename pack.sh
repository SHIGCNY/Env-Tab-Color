#!/usr/bin/env bash
# 打包上架用的干净 zip：只含运行时必需文件，排除开发/版本控制产物。
# 用法：./pack.sh   产物：dist/env-tab-color-<version>.zip
set -euo pipefail

cd "$(dirname "$0")"

# 从 manifest.json 读取版本号（无 jq 依赖）
VERSION=$(grep -m1 '"version"' manifest.json | sed -E 's/.*"version"[^"]*"([^"]+)".*/\1/')
OUT="dist/env-tab-color-${VERSION}.zip"

mkdir -p dist
rm -f "$OUT"

# 仅打包上架必需内容：清单、源码、图标
zip -r "$OUT" \
  manifest.json \
  src \
  icons \
  -x '*.DS_Store' '*/.DS_Store'

echo "✅ 已生成 $OUT"
echo "   上传前可解压检查：unzip -l \"$OUT\""
