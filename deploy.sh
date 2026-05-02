#!/bin/bash
set -e
echo "🏗️  Build..."
npm run build

echo "🚀  Deploy su Cloudflare Pages..."
npx wrangler pages deploy dist --project-name sfida60 --branch main

echo "✅  Fatto! App live su https://sfida60.pages.dev"
