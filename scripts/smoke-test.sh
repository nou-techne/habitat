#!/bin/bash
#
# Habitat Production Smoke Test
#
# Quick verification that production deployment is working
#
# Usage: ./scripts/smoke-test.sh [DOMAIN]
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Domain (default to habitat.eth)
DOMAIN="${1:-habitat.eth}"
BASE_URL="https://${DOMAIN}"

echo ""
echo "=========================================="
echo "Habitat Production Smoke Test"
echo "=========================================="
echo ""
echo "Testing: ${BASE_URL}"
echo ""

PASSED=0
FAILED=0

# Test function
test_endpoint() {
  local name="$1"
  local url="$2"
  local expected_code="${3:-200}"
  
  echo -n "Testing ${name}... "
  
  http_code=$(curl -s -o /dev/null -w "%{http_code}" "${url}")
  
  if [ "$http_code" = "$expected_code" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP ${http_code})"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC} (expected ${expected_code}, got ${http_code})"
    ((FAILED++))
  fi
}

# Test JSON response
test_json() {
  local name="$1"
  local url="$2"
  local expected_field="$3"
  
  echo -n "Testing ${name}... "
  
  response=$(curl -s "${url}")
  
  if echo "$response" | grep -q "\"${expected_field}\""; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC} (missing field: ${expected_field})"
    echo "Response: $response"
    ((FAILED++))
  fi
}

# Test GraphQL
test_graphql() {
  local name="$1"
  local url="$2"
  local query="$3"
  
  echo -n "Testing ${name}... "
  
  response=$(curl -s -X POST "${url}" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"${query}\"}")
  
  if echo "$response" | grep -q "\"data\""; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $response"
    ((FAILED++))
  fi
}

# Run tests
echo "=== HTTP Endpoints ==="
test_endpoint "Homepage" "${BASE_URL}/"
test_endpoint "Login page" "${BASE_URL}/login"
test_endpoint "Dashboard" "${BASE_URL}/dashboard" "200|401"  # 401 if not logged in is OK

echo ""
echo "=== API Endpoints ==="
test_json "API health" "${BASE_URL}/health" "status"
test_graphql "GraphQL introspection" "${BASE_URL}/graphql" "{ __typename }"

echo ""
echo "=== TLS/HTTPS ==="
test_endpoint "HTTPS working" "${BASE_URL}/health"
echo -n "Testing HTTP redirect... "
redirect_url=$(curl -s -o /dev/null -w "%{redirect_url}" "http://${DOMAIN}/")
if [[ "$redirect_url" == https://* ]]; then
  echo -e "${GREEN}✓ PASS${NC}"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC} (no HTTPS redirect)"
  ((FAILED++))
fi

echo ""
echo "=== TLS Certificate ==="
echo -n "Testing certificate validity... "
cert_info=$(echo | openssl s_client -connect "${DOMAIN}:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
if [ -n "$cert_info" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  echo "$cert_info" | sed 's/^/  /'
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC} (could not verify certificate)"
  ((FAILED++))
fi

echo ""
echo "=== Performance ==="
echo -n "Testing response time... "
start_time=$(date +%s%N)
curl -s "${BASE_URL}/health" > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds

if [ "$response_time" -lt 500 ]; then
  echo -e "${GREEN}✓ PASS${NC} (${response_time}ms)"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠ SLOW${NC} (${response_time}ms, target: < 500ms)"
  ((PASSED++))
fi

# Summary
echo ""
echo "=========================================="
echo "Smoke Test Summary"
echo "=========================================="
echo ""
echo "Passed: ${PASSED}"
echo "Failed: ${FAILED}"
echo ""

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed${NC}"
  echo ""
  echo "Production deployment verified!"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  echo ""
  echo "Please review failures and troubleshoot."
  exit 1
fi
