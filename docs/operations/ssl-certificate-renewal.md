# SSL Certificate Renewal Runbook

## Overview

Procedures for managing SSL/TLS certificates in Habitat, including automatic renewal with Let's Encrypt and manual certificate management.

## Certificate Setup

Habitat uses Caddy for automatic HTTPS with Let's Encrypt certificates.

**Certificate Storage:** `/var/lib/docker/volumes/habitat_caddy-data/_data/caddy/certificates`

**Auto-renewal:** Caddy automatically renews certificates 30 days before expiration

## Prerequisites

- Domain name pointing to server
- Ports 80 and 443 accessible from internet
- Caddy running with proper configuration
- Email address for Let's Encrypt notifications

## Automatic Renewal (Caddy + Let's Encrypt)

### Verify Auto-Renewal is Working

```bash
# Check certificate expiration
echo | openssl s_client -servername habitat.example.com -connect habitat.example.com:443 2>/dev/null | openssl x509 -noout -dates

# Output shows:
# notBefore=Feb 10 00:00:00 2026 GMT
# notAfter=May 11 00:00:00 2026 GMT
```

### Check Caddy Logs

```bash
# View certificate-related logs
docker compose -f docker-compose.prod.yml logs caddy | grep -i "certificate\|acme\|renew"

# Successful renewal shows:
# certificate obtained successfully
# renewed certificate
```

### Force Manual Renewal

```bash
# Restart Caddy to trigger renewal check
docker compose -f docker-compose.prod.yml restart caddy

# Watch logs
docker compose -f docker-compose.prod.yml logs -f caddy
```

## Certificate Locations

### List Certificates

```bash
# View certificate storage
docker compose -f docker-compose.prod.yml exec caddy \
  ls -lah /data/caddy/certificates/

# View specific domain certificates
docker compose -f docker-compose.prod.yml exec caddy \
  ls -lah /data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/habitat.example.com/
```

### Inspect Certificate

```bash
# View certificate details
docker compose -f docker-compose.prod.yml exec caddy \
  cat /data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/habitat.example.com/habitat.example.com.crt \
  | openssl x509 -text -noout
```

## Troubleshooting Auto-Renewal

### Certificate Expired

**Symptom:** Browser shows "Your connection is not private" or "Certificate expired"

**Cause:** Auto-renewal failed

**Solution:**

```bash
# 1. Check Caddy is running
docker compose -f docker-compose.prod.yml ps caddy

# 2. Check ports are accessible
curl -I http://habitat.example.com/.well-known/acme-challenge/test
# Should return 404 (not 403 or timeout)

# 3. Check DNS is correct
dig habitat.example.com
# Should point to server IP

# 4. Check Caddy logs for errors
docker compose -f docker-compose.prod.yml logs caddy | tail -100

# 5. Remove old certificates
docker compose -f docker-compose.prod.yml exec caddy \
  rm -rf /data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/habitat.example.com/

# 6. Restart Caddy (will obtain new cert)
docker compose -f docker-compose.prod.yml restart caddy

# 7. Verify new certificate
echo | openssl s_client -servername habitat.example.com -connect habitat.example.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Rate Limited by Let's Encrypt

**Symptom:** Caddy logs show "too many certificates already issued"

**Cause:** Let's Encrypt rate limits (5 certificates per week per domain)

**Solution:**

```bash
# Wait for rate limit to reset (typically 1 week)
# Or use staging environment for testing

# Use Let's Encrypt staging for testing
# Edit Caddyfile:
{
  acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}

# Restart Caddy
docker compose -f docker-compose.prod.yml restart caddy
```

### DNS Challenge Required

**Symptom:** HTTP challenge fails due to firewall/proxy

**Solution:**

```bash
# Use DNS challenge instead of HTTP
# Edit Caddyfile:
habitat.example.com {
  tls {
    dns cloudflare {env.CLOUDFLARE_API_TOKEN}
  }
}

# Set DNS provider token
echo "CLOUDFLARE_API_TOKEN=your_token" >> .env

# Restart Caddy
docker compose -f docker-compose.prod.yml up -d caddy
```

## Manual Certificate Management

### Use Custom Certificate

If you have your own certificate (e.g., from corporate CA):

```bash
# 1. Copy certificate files to server
scp server.crt server.key user@habitat-server:/opt/habitat/certs/

# 2. Update Caddyfile
habitat.example.com {
  tls /etc/caddy/certs/server.crt /etc/caddy/certs/server.key
}

# 3. Update docker-compose.prod.yml to mount certs
services:
  caddy:
    volumes:
      - ./certs:/etc/caddy/certs:ro

# 4. Restart Caddy
docker compose -f docker-compose.prod.yml up -d caddy
```

### Generate Self-Signed Certificate (Development)

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Habitat/CN=habitat.local"

# Move to certs directory
mkdir -p certs
mv cert.pem key.pem certs/

# Update Caddyfile
habitat.local {
  tls /etc/caddy/certs/cert.pem /etc/caddy/certs/key.pem
}

# Restart Caddy
docker compose -f docker-compose.prod.yml restart caddy
```

## Certificate Backup

### Backup Certificates

```bash
# Backup entire caddy-data volume
docker run --rm \
  -v habitat_caddy-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/caddy-certs-$(date +%Y%m%d).tar.gz /data/caddy/certificates

# Verify backup
tar tzf backups/caddy-certs-$(date +%Y%m%d).tar.gz | head
```

### Restore Certificates

```bash
# Stop Caddy
docker compose -f docker-compose.prod.yml stop caddy

# Restore certificates
docker run --rm \
  -v habitat_caddy-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/caddy-certs-20260210.tar.gz -C /

# Start Caddy
docker compose -f docker-compose.prod.yml start caddy
```

## Certificate Monitoring

### Set Up Expiration Alerts

```bash
#!/bin/bash
# check-cert-expiry.sh - Alert if certificate expires soon

DOMAIN="habitat.example.com"
ALERT_DAYS=30

# Get certificate expiration date
EXPIRY=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)

# Convert to Unix timestamp
EXPIRY_TS=$(date -d "$EXPIRY" +%s)
NOW_TS=$(date +%s)

# Calculate days until expiry
DAYS_LEFT=$(( ($EXPIRY_TS - $NOW_TS) / 86400 ))

echo "Certificate for $DOMAIN expires in $DAYS_LEFT days"

if [ $DAYS_LEFT -lt $ALERT_DAYS ]; then
  echo "WARNING: Certificate expires soon!"
  # Send alert (email, Slack, etc.)
  curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
    -d "{\"text\":\"⚠️ SSL certificate for $DOMAIN expires in $DAYS_LEFT days\"}"
fi
```

### Add to Cron

```bash
# Check certificate daily at 9 AM
0 9 * * * /opt/habitat/check-cert-expiry.sh
```

### Prometheus Metric

Add to monitoring:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'ssl-exporter'
    static_configs:
      - targets:
          - habitat.example.com:443
    metrics_path: /probe
    params:
      module: [https]
```

## Multi-Domain Certificates

### Add Additional Domains

```bash
# Edit Caddyfile to include multiple domains
habitat.example.com, www.habitat.example.com, api.habitat.example.com {
  # Configuration applies to all domains
  reverse_proxy ui:3000
}

# Or separate configurations
habitat.example.com {
  reverse_proxy ui:3000
}

api.habitat.example.com {
  reverse_proxy api:4000
}

# Restart Caddy
docker compose -f docker-compose.prod.yml restart caddy
```

### Wildcard Certificate

```bash
# Requires DNS challenge
*.habitat.example.com {
  tls {
    dns cloudflare {env.CLOUDFLARE_API_TOKEN}
  }
  
  # Route by subdomain
  @api host api.habitat.example.com
  handle @api {
    reverse_proxy api:4000
  }
  
  @www host www.habitat.example.com
  handle @www {
    reverse_proxy ui:3000
  }
}
```

## Certificate Revocation

### When to Revoke

- Private key compromised
- Certificate issued incorrectly
- Domain ownership changed
- Retiring the domain

### How to Revoke

```bash
# Using Caddy
docker compose -f docker-compose.prod.yml exec caddy \
  caddy untrust /data/caddy/certificates/.../cert.pem

# Using Certbot
certbot revoke --cert-path /path/to/cert.pem

# Via Let's Encrypt web interface
# https://letsencrypt.org/docs/revoking/
```

## Best Practices

1. **Monitor expiration dates**
   - Set up alerts for certificates expiring in <30 days
   - Check weekly via cron job

2. **Test renewal before expiry**
   - Force renewal 2 weeks before expiration
   - Verify in staging environment

3. **Backup certificates**
   - Include in regular backup routine
   - Store securely (encrypted)

4. **Keep Caddy updated**
   - Update Caddy image regularly
   - Check for ACME client updates

5. **Use strong keys**
   - RSA 2048+ or ECDSA P-256+
   - Rotate keys yearly

6. **Enable HSTS**
   - Already configured in Caddyfile
   - Prevents SSL stripping attacks

7. **Monitor certificate transparency logs**
   - https://crt.sh/?q=habitat.example.com
   - Alerts for unexpected certificates

## Certificate Checklist

### Setup Checklist

- [ ] Domain DNS points to server
- [ ] Ports 80 and 443 open
- [ ] Caddy configured with domain name
- [ ] Email set for Let's Encrypt notifications
- [ ] Certificate obtained successfully
- [ ] HTTPS working in browser
- [ ] Auto-renewal verified (check logs)
- [ ] Expiration monitoring set up
- [ ] Backup procedure tested

### Renewal Checklist

- [ ] Certificate expires in <30 days
- [ ] Ports still accessible
- [ ] DNS still correct
- [ ] Caddy running and healthy
- [ ] Backup of old certificate
- [ ] Renewal triggered (auto or manual)
- [ ] New certificate verified
- [ ] HTTPS still working
- [ ] No browser warnings
- [ ] Monitoring updated

## Emergency Procedures

### Certificate Expires in <24 Hours

```bash
# Immediate action required

# 1. Backup current certificate
docker run --rm -v habitat_caddy-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/emergency-cert-backup.tar.gz /data/caddy/certificates

# 2. Remove old certificate
docker compose -f docker-compose.prod.yml exec caddy \
  rm -rf /data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/habitat.example.com/

# 3. Restart Caddy to force renewal
docker compose -f docker-compose.prod.yml restart caddy

# 4. Watch logs closely
docker compose -f docker-compose.prod.yml logs -f caddy

# 5. If renewal fails, use temporary self-signed cert
# Generate and apply (see above)

# 6. Troubleshoot renewal issue
# Check DNS, ports, rate limits

# 7. Once fixed, obtain proper certificate
```

### Rate Limited - Need Certificate Now

```bash
# Option 1: Use different domain
# api.habitat.example.com instead of habitat.example.com

# Option 2: Use different CA
# Switch to ZeroSSL or Google Trust Services

# Option 3: Use existing valid certificate
# Restore from backup if recent cert available

# Option 4: Wait for rate limit reset
# Contact Let's Encrypt support for emergency override
```

## Support Resources

- **Let's Encrypt Status:** https://letsencrypt.status.io/
- **Caddy Documentation:** https://caddyserver.com/docs/automatic-https
- **Rate Limits:** https://letsencrypt.org/docs/rate-limits/
- **Certificate Transparency:** https://crt.sh/
- **SSL Labs Test:** https://www.ssllabs.com/ssltest/
