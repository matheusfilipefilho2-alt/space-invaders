#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

echo "🧪 Testing Space Invaders API"
echo "================================"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
curl -s "$BASE_URL/health" | jq '.'
echo ""
echo ""

# Test 2: Register a new player
echo -e "${YELLOW}Test 2: Register a new player${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testplayer",
    "email": "test@example.com",
    "password": "password123"
  }')
echo "$REGISTER_RESPONSE" | jq '.'

# Extract token
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token')
echo ""
echo -e "${GREEN}Token: $TOKEN${NC}"
echo ""
echo ""

# Test 3: Login
echo -e "${YELLOW}Test 3: Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testplayer",
    "password": "password123"
  }')
echo "$LOGIN_RESPONSE" | jq '.'
echo ""
echo ""

# Test 4: Get Player Profile (Protected)
echo -e "${YELLOW}Test 4: Get Player Profile (Protected)${NC}"
curl -s -X GET "$BASE_URL/api/v1/players/me" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""
echo ""

# Test 5: Update Player Profile (Protected)
echo -e "${YELLOW}Test 5: Update Player Profile (Protected)${NC}"
curl -s -X PUT "$BASE_URL/api/v1/players/me" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "updated@example.com",
    "notifyOffers": false,
    "notifyAchievements": true
  }' | jq '.'
echo ""
echo ""

# Test 6: Try to access protected endpoint without token (should fail)
echo -e "${YELLOW}Test 6: Access protected endpoint without token (should fail)${NC}"
curl -s -X GET "$BASE_URL/api/v1/players/me" | jq '.'
echo ""
echo ""

# Test 7: Try to register with existing username (should fail)
echo -e "${YELLOW}Test 7: Register with existing username (should fail)${NC}"
curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testplayer",
    "email": "another@example.com",
    "password": "password123"
  }' | jq '.'
echo ""
echo ""

# Test 8: Login with wrong password (should fail)
echo -e "${YELLOW}Test 8: Login with wrong password (should fail)${NC}"
curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testplayer",
    "password": "wrongpassword"
  }' | jq '.'
echo ""

echo ""
echo -e "${GREEN}✅ All tests completed!${NC}"
