#!/bin/bash

# Test password reset email flow with new agent

echo "🔐 Testing Password Reset Email Queue Flow"
echo "=========================================="
echo ""

# Step 1: Request password reset
echo "📧 Step 1: Requesting password reset for sewapetj@gmail.com..."
RESPONSE=$(curl -s -X POST http://localhost:2200/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"sewapetj@gmail.com"}')

echo "Response: $RESPONSE"
echo ""

# Step 2: Check Redis queue
echo "📊 Step 2: Checking Redis email queue..."
docker compose exec redis redis-cli LLEN "quora-app:email:queue" || echo "Could not check queue"
echo ""

# Step 3: Check queue stats every 2 seconds
echo "⏳ Step 3: Monitoring queue processing for 10 seconds..."
for i in {1..5}; do
  sleep 2
  PENDING=$(docker compose exec redis redis-cli LLEN "quora-app:email:queue" 2>/dev/null || echo "?")
  PROCESSING=$(docker compose exec redis redis-cli LLEN "quora-app:email:processing" 2>/dev/null || echo "?")
  echo "[$i] Pending: $PENDING, Processing: $PROCESSING"
done

echo ""
echo "✅ Test complete! Check MailHog at http://localhost:8025 to see if email was sent."
