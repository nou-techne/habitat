# Habitat Operations Runbooks

Comprehensive operational procedures for running and maintaining Habitat in production.

## Contents

### Core Operations

1. **[Backup and Restore](./backup-restore.md)**
   - Database backup procedures
   - Volume backup and restore
   - Configuration backup
   - Full system backup script
   - Automated backup scheduling
   - Backup verification and testing

2. **[Disaster Recovery](./disaster-recovery.md)**
   - Recovery time objectives (RTO)
   - Recovery point objectives (RPO)
   - Disaster response phases
   - Complete server failure recovery
   - Database corruption recovery
   - Ransomware recovery
   - Post-mortem template

3. **[Database Migration](./database-migration.md)**
   - Manual migration procedures
   - Automated migration via CI/CD
   - Zero-downtime migration strategies
   - Migration rollback procedures
   - Common migration patterns
   - Troubleshooting migration issues

### Infrastructure Management

4. **[SSL Certificate Renewal](./ssl-certificate-renewal.md)**
   - Let's Encrypt automatic renewal
   - Manual certificate management
   - Certificate troubleshooting
   - Multi-domain certificates
   - Certificate revocation
   - Monitoring expiration dates

5. **[Scaling Guide](./scaling.md)**
   - Horizontal vs vertical scaling
   - When to scale (metrics and indicators)
   - API server scaling
   - Worker scaling and auto-scaling
   - Database scaling (replicas, pooling)
   - RabbitMQ clustering
   - Load testing procedures
   - Cost optimization

### Maintenance Procedures

6. **[Event Replay](./event-replay.md)**
   - Event sourcing architecture
   - Viewing processed events
   - Replaying single events
   - Batch event replay
   - Workflow replay (period close, allocations)
   - Idempotency considerations
   - Monitoring replay progress

7. **[Troubleshooting Decision Tree](./troubleshooting.md)**
   - Quick health check
   - Site completely down diagnosis
   - Performance degradation diagnosis
   - Application error resolution
   - Feature-specific issues
   - Emergency procedures
   - Diagnostic commands cheat sheet

## Quick Reference

### Emergency Contacts

- **Incident Commander:** [contact info]
- **DevOps Lead:** [contact info]
- **Database Admin:** [contact info]
- **Security Lead:** [contact info]

### Critical Commands

```bash
# Full health check
docker compose -f docker-compose.prod.yml ps
curl -f https://habitat.example.com/api/health

# Quick restart
docker compose -f docker-compose.prod.yml restart

# View recent logs
docker compose -f docker-compose.prod.yml logs --tail=100 api worker

# Backup database
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U habitat -Fc habitat > backups/emergency-$(date +%Y%m%d-%H%M%S).dump

# Scale workers
docker compose -f docker-compose.prod.yml up -d --scale worker=5
```

### Monitoring URLs

- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3001
- **RabbitMQ Management:** http://localhost:15672
- **API Metrics:** https://habitat.example.com/metrics

## Runbook Usage

Each runbook follows this structure:

1. **Overview** - Purpose and scope
2. **Prerequisites** - What you need before starting
3. **Procedures** - Step-by-step instructions
4. **Troubleshooting** - Common issues and solutions
5. **Best Practices** - Recommendations and tips
6. **Checklists** - Verification steps

## When to Use Each Runbook

| Situation | Runbook |
|-----------|---------|
| Database corrupted | [Disaster Recovery](./disaster-recovery.md) |
| System slow | [Troubleshooting](./troubleshooting.md) |
| High load expected | [Scaling Guide](./scaling.md) |
| Migration needed | [Database Migration](./database-migration.md) |
| Certificate expiring | [SSL Certificate Renewal](./ssl-certificate-renewal.md) |
| Events need reprocessing | [Event Replay](./event-replay.md) |
| Regular maintenance | [Backup and Restore](./backup-restore.md) |

## Operational Schedule

### Daily

- [ ] Check backup completion (automated)
- [ ] Review monitoring alerts
- [ ] Check error rates in Grafana
- [ ] Verify SSL certificate validity

### Weekly

- [ ] Test backup restoration
- [ ] Review capacity metrics
- [ ] Update dependencies
- [ ] Check security advisories
- [ ] Clean up old backups

### Monthly

- [ ] Disaster recovery drill
- [ ] Performance review
- [ ] Capacity planning meeting
- [ ] Security audit
- [ ] Update documentation

### Quarterly

- [ ] Full DR test (complete recovery)
- [ ] Load testing
- [ ] Infrastructure cost review
- [ ] On-call rotation review
- [ ] Runbook updates

## Incident Response

### Phase 1: Detection (0-5 min)

1. Alert received or issue reported
2. Acknowledge incident
3. Assess severity
4. Notify stakeholders

### Phase 2: Triage (5-15 min)

1. Identify symptoms
2. Check monitoring dashboards
3. Review recent changes
4. Determine root cause category

### Phase 3: Response (15+ min)

1. Execute appropriate runbook
2. Monitor progress
3. Update stakeholders
4. Document actions taken

### Phase 4: Recovery

1. Verify system health
2. Monitor for recurrence
3. Close incident
4. Schedule post-mortem

### Phase 5: Post-Mortem

1. Write incident report
2. Identify root cause
3. Document lessons learned
4. Create action items
5. Update runbooks

## Best Practices

### General

- **Test in staging first** - Never try procedures on production first
- **Backup before changes** - Always create backup before risky operations
- **Document everything** - Record actions, decisions, and outcomes
- **Use checklists** - Follow procedures consistently
- **Monitor actively** - Watch metrics during operations
- **Communicate clearly** - Keep stakeholders informed

### Security

- **Rotate credentials regularly** - Monthly for production
- **Use strong passwords** - Generated, not memorable
- **Limit access** - Principle of least privilege
- **Audit access logs** - Review who did what
- **Encrypt backups** - Protect sensitive data
- **Follow incident procedures** - Don't panic, follow plan

### Automation

- **Automate repetitive tasks** - Backups, deployments, scaling
- **Test automation** - Regularly verify automated processes
- **Monitor automation** - Alert on automation failures
- **Document automation** - Explain what it does and why
- **Version control scripts** - Track changes to automation

## Contributing to Runbooks

When updating runbooks:

1. Test procedures thoroughly
2. Use clear, concise language
3. Include example commands
4. Add troubleshooting sections
5. Update checklists
6. Note date of last test
7. Submit PR for review

## Additional Resources

### Documentation

- [Deployment Guide](../../README.deployment.md)
- [CI/CD Pipeline](../../README.ci-cd.md)
- [Monitoring Setup](../../monitoring/README.md)
- [Architecture Overview](../../docs/architecture.md)

### External Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [RabbitMQ Operations Guide](https://www.rabbitmq.com/operations.html)
- [Caddy Documentation](https://caddyserver.com/docs/)
- [Let's Encrypt Best Practices](https://letsencrypt.org/docs/)

### Support Channels

- **Documentation:** https://docs.habitat.eth
- **GitHub Issues:** https://github.com/habitat/habitat/issues
- **Discord:** https://discord.gg/habitat
- **Emergency On-Call:** [contact details]

---

**Last Updated:** February 10, 2026  
**Version:** 1.0.0  
**Maintainer:** DevOps Team
