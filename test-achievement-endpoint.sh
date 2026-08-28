#!/bin/bash

# Test achievement endpoint

echo "1. Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password123"}')

echo "Login response: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
echo "Token: $TOKEN"

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Falha ao fazer login"
  exit 1
fi

echo -e "\n2. Testando endpoint de achievements..."
ACHIEVEMENT_RESPONSE=$(curl -s -X POST http://localhost:8080/api/achievements/check-game-stats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "score": 5000,
    "killCount": 50,
    "maxCombo": 10,
    "level": 5,
    "bossKills": 1,
    "accuracy": 85
  }')

echo "Achievement response:"
echo $ACHIEVEMENT_RESPONSE | jq '.'

echo -e "\n✅ Teste concluído!"
