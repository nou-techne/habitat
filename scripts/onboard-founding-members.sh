#!/bin/bash
#
# Onboard Founding Members Script
#
# Creates accounts for all Techne/RegenHub founding members
#
# Usage: ./scripts/onboard-founding-members.sh <members.csv>
#
# CSV Format: email,display_name,role
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 1 ]; then
  echo "Usage: $0 <members.csv>"
  echo ""
  echo "CSV format: email,display_name,role"
  echo ""
  echo "Example CSV:"
  echo "  todd@techne.studio,Todd Youngblood,admin"
  echo "  kevin@allo.capital,Kevin Owocki,member"
  exit 1
fi

MEMBERS_FILE="$1"

if [ ! -f "$MEMBERS_FILE" ]; then
  echo -e "${RED}Error: File not found: $MEMBERS_FILE${NC}"
  exit 1
fi

echo ""
echo "=========================================="
echo "Onboard Founding Members"
echo "=========================================="
echo ""

# Count members
MEMBER_COUNT=$(tail -n +2 "$MEMBERS_FILE" | wc -l)
echo "Found $MEMBER_COUNT members to onboard"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 1
fi

echo ""

# Process each member
CREATED=0
FAILED=0

while IFS=, read -r email display_name role; do
  # Skip header row
  if [ "$email" = "email" ]; then
    continue
  fi
  
  # Trim whitespace
  email=$(echo "$email" | xargs)
  display_name=$(echo "$display_name" | xargs)
  role=$(echo "$role" | xargs)
  
  echo "----------------------------------------"
  echo "Creating account for: $display_name"
  echo "Email: $email"
  echo "Role: $role"
  echo ""
  
  # Create member account
  if ./scripts/create-member.sh "$email" "$display_name" "$role"; then
    echo -e "${GREEN}✓ Success${NC}"
    ((CREATED++))
  else
    echo -e "${RED}✗ Failed${NC}"
    ((FAILED++))
  fi
  
  echo ""
  
done < "$MEMBERS_FILE"

# Summary
echo "=========================================="
echo "Onboarding Complete"
echo "=========================================="
echo ""
echo "Created: $CREATED"
echo "Failed:  $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All members onboarded successfully!${NC}"
else
  echo -e "${YELLOW}Some members failed. Review errors above.${NC}"
fi

echo ""
echo "Next steps:"
echo "1. Review generated credential files in credentials/"
echo "2. Send welcome emails using templates in credentials/"
echo "3. Verify all members can log in"
echo "4. Schedule onboarding office hours"
echo ""
echo "Credential files contain plaintext passwords."
echo "Send emails promptly, then securely delete credential files."
echo ""
