#!/bin/bash
#
# Create Member Account Script
#
# Creates a new member account in Habitat and generates secure credentials
#
# Usage: ./scripts/create-member.sh <email> <display_name> <role>
#
# Example: ./scripts/create-member.sh todd@techne.studio "Todd Youngblood" admin
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 3 ]; then
  echo "Usage: $0 <email> <display_name> <role>"
  echo ""
  echo "Roles: member, steward, admin"
  echo ""
  echo "Example: $0 todd@techne.studio \"Todd Youngblood\" admin"
  exit 1
fi

EMAIL="$1"
DISPLAY_NAME="$2"
ROLE="$3"

# Validate role
if [[ ! "$ROLE" =~ ^(member|steward|admin)$ ]]; then
  echo -e "${RED}Error: Role must be member, steward, or admin${NC}"
  exit 1
fi

# Validate email format
if [[ ! "$EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
  echo -e "${RED}Error: Invalid email format${NC}"
  exit 1
fi

echo ""
echo "=========================================="
echo "Create Member Account"
echo "=========================================="
echo ""
echo "Email:        $EMAIL"
echo "Display Name: $DISPLAY_NAME"
echo "Role:         $ROLE"
echo ""

# Generate secure temporary password
TEMP_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

echo -e "${YELLOW}Generating secure password...${NC}"
echo "Temporary password: $TEMP_PASSWORD"
echo ""

# Hash password for database
PASSWORD_HASH=$(echo -n "$TEMP_PASSWORD" | openssl dgst -sha256 -binary | base64)

# Check if running in Docker or native
if command -v docker compose &> /dev/null && [ -f "docker-compose.prod.yml" ]; then
  echo -e "${YELLOW}Creating account in database (Docker)...${NC}"
  
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U habitat -d habitat <<EOF
INSERT INTO members (email, display_name, role, status, password_hash, joined_at)
VALUES ('$EMAIL', '$DISPLAY_NAME', '$ROLE', 'active', '$PASSWORD_HASH', NOW())
ON CONFLICT (email) DO UPDATE
SET display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status;

-- Create capital account
INSERT INTO capital_accounts (member_id, balance, tax_basis)
SELECT id, 0.00, 0.00
FROM members
WHERE email = '$EMAIL'
ON CONFLICT (member_id) DO NOTHING;
EOF

else
  echo -e "${YELLOW}Creating account in database (native)...${NC}"
  
  psql $DATABASE_URL <<EOF
INSERT INTO members (email, display_name, role, status, password_hash, joined_at)
VALUES ('$EMAIL', '$DISPLAY_NAME', '$ROLE', 'active', '$PASSWORD_HASH', NOW())
ON CONFLICT (email) DO UPDATE
SET display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status;

-- Create capital account
INSERT INTO capital_accounts (member_id, balance, tax_basis)
SELECT id, 0.00, 0.00
FROM members
WHERE email = '$EMAIL'
ON CONFLICT (member_id) DO NOTHING;
EOF

fi

echo -e "${GREEN}✓ Account created${NC}"
echo ""

# Generate credential file
CRED_FILE="credentials/${EMAIL}_credentials.txt"
mkdir -p credentials

cat > "$CRED_FILE" <<EOF
Habitat Member Credentials
==========================

Welcome to Habitat, the patronage accounting system for Techne/RegenHub!

Your Account
------------
Email:             $EMAIL
Display Name:      $DISPLAY_NAME
Role:              $ROLE
Temporary Password: $TEMP_PASSWORD

Getting Started
---------------
1. Log in at: https://habitat.eth/login
2. Use the email and temporary password above
3. You will be prompted to change your password
4. Choose a strong password (12+ characters, mix of letters/numbers/symbols)

5. Explore your dashboard
6. Read the onboarding guide: https://habitat.eth/onboarding
7. Submit your first contribution!

Support
-------
Questions? Email admin@habitat.eth or ask in Slack #habitat

This is a temporary password. You MUST change it on first login.
Keep these credentials secure and do not share them.

---
Generated: $(date)
EOF

echo -e "${GREEN}✓ Credentials saved to: $CRED_FILE${NC}"
echo ""

# Generate email template
EMAIL_FILE="credentials/${EMAIL}_email.txt"

cat > "$EMAIL_FILE" <<EOF
Subject: Welcome to Habitat - Your Credentials

Hi $DISPLAY_NAME,

Welcome to Habitat, our patronage accounting system for Techne/RegenHub!

Your account has been created. Here are your login credentials:

Login URL: https://habitat.eth/login
Email: $EMAIL
Temporary Password: $TEMP_PASSWORD

IMPORTANT: You must change your password on first login.

Getting Started:
1. Click the login URL above
2. Enter your email and temporary password
3. Choose a strong new password
4. Explore your dashboard
5. Read the onboarding guide: https://habitat.eth/onboarding

Your account gives you access to:
- Submit contributions (labor, capital, property)
- View your capital account
- Track your allocations
- View patronage statements

What to do next:
- Submit your first contribution (even if small, to get familiar)
- Join Slack #habitat for support and discussion
- Attend Wednesday office hours (2-3 PM MT) if you have questions

Questions? Reply to this email or ask in Slack #habitat.

Looking forward to building this together!

---
Admin Team
Habitat Patronage System
admin@habitat.eth
EOF

echo -e "${GREEN}✓ Email template saved to: $EMAIL_FILE${NC}"
echo ""

# Summary
echo "=========================================="
echo "Account Created Successfully"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review credential file: $CRED_FILE"
echo "2. Send email using template: $EMAIL_FILE"
echo "3. Verify member can log in"
echo ""
echo -e "${YELLOW}Important: Keep credential files secure!${NC}"
echo "These files contain plaintext passwords."
echo ""
