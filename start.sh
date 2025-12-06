#!/bin/bash

# jsonlol - Local Server Launcher (Mac/Linux)
# This script starts a local server to run the built app

echo "🚀 Starting jsonlol..."
echo ""

# Check if we're in the dist folder or project root
if [ -f "index.html" ] && [ -d "assets" ]; then
    # We're in dist folder
    DIR="."
elif [ -d "dist" ]; then
    # We're in project root
    DIR="dist"
else
    echo "❌ Error: Could not find built app."
    echo "   Please run 'npm run build' first, or ensure you're in the correct directory."
    exit 1
fi

# Try to find an available port
PORT=3000
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
    PORT=$((PORT + 1))
done

echo "📂 Serving from: $DIR"
echo "🌐 Opening http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Open browser after a short delay
(sleep 1 && open "http://localhost:$PORT" 2>/dev/null || xdg-open "http://localhost:$PORT" 2>/dev/null) &

# Start server using npx serve (comes with npm)
npx --yes serve "$DIR" -l $PORT

