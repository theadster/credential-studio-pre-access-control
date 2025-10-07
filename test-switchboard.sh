#!/bin/bash

# Test Switchboard Configuration Script
# This script tests your Switchboard Canvas integration configuration

echo "Testing Switchboard Configuration..."
echo ""

# Check if the dev server is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ Error: Development server is not running"
    echo "Please start it with: npm run dev"
    exit 1
fi

echo "✓ Development server is running"
echo ""
echo "Fetching Switchboard configuration..."
echo ""

# Make the request and format the output
curl -s http://localhost:3000/api/integrations/test-switchboard \
  -H "Content-Type: application/json" \
  -b "appwrite-session=$(cat .cookies 2>/dev/null || echo '')" \
  | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/api/integrations/test-switchboard

echo ""
echo ""
echo "If you see an authentication error, you need to be logged in."
echo "Open http://localhost:3000/api/integrations/test-switchboard in your browser while logged in."
