#!/bin/bash
# ==========================================================
# School Management App — Academics Module
# One-click starter for Mac / Linux
# ==========================================================
set -e
cd "$(dirname "$0")/backend"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies (first run only)..."
    npm install
fi

echo ""
echo "=================================================="
echo " Starting School Management App - Academics Module"
echo " Once started, open: http://localhost:4000"
echo "=================================================="
echo ""

npm start
