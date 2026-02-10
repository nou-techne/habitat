# CI/CD Pipeline Documentation

## Overview

Habitat uses GitHub Actions for continuous integration and deployment. The pipeline ensures code quality, runs tests, builds Docker images, and deploys to staging and production environments.

## Workflows

### CI - Continuous Integration

**Trigger:** Pull requests to `main` or `develop` branches, pushes to `develop`

**Jobs:**

1. **Lint** - Code style and formatting checks
   - ESLint for TypeScript/JavaScript
   - Prettier for formatting
   - Runs on all packages (API, worker, shared, UI)

2. **Type Check** - TypeScript type checking
   - Verifies all TypeScript compiles without errors
   - Catches type errors before runtime

3. **Test** - Unit and integration tests
   - Runs tests for shared, API, and worker packages
   - Uses PostgreSQL service container for integration tests
   - Coverage reporting

4. **Security** - Dependency audits
   - npm audit for known vulnerabilities
   - Checks production dependencies
   - Fails on high/critical vulnerabilities

5. **Build** - Docker image validation
   - Builds API, worker, and UI Docker images
   - Validates Dockerfiles
   - Uses layer caching for speed

**Required Checks:** All jobs must pass before PR can be merged

### CD - Continuous Deployment

**Trigger:** Push to `main` branch or manual workflow dispatch

**Jobs:**

1. **Build and Push** - Build and publish Docker images
   - Builds images for API, worker, and UI
   - Pushes to GitHub Container Registry (ghcr.io)
   - Tags: branch name, commit SHA, semver
   - Uses Docker layer caching

2. **Deploy to Staging** - Automatic staging deployment
   - Pulls latest images
   - Runs database migrations
   - Zero-downtime restart
   - Health check verification
   - Automatic on `main` branch push

3. **Deploy to Production** - Manual production deployment
   - Requires staging deployment success
   - Creates database backup
   - Tags current images for rollback
   - Blue-green deployment strategy
   - Health check verification
   - Manual approval required

4. **Rollback** - Automatic rollback on failure
   - Triggered if production deployment fails
   - Restores previous Docker images
   - Optionally restores database backup

### Database Migration

**Trigger:** Manual workflow dispatch

**Parameters:**
- `environment`: staging or production
- `direction`: up (apply) or down (rollback)

**Steps:**
1. Create database backup
2. Run migration (up or down)
3. Verify migration status

## Setup

### Required Secrets

Add these secrets to your GitHub repository settings:

#### Staging Environment
- `STAGING_SSH_KEY` - SSH private key for staging server
- `STAGING_HOST` - Staging server hostname/IP
- `STAGING_USER` - SSH username
- `STAGING_DEPLOY_PATH` - Deployment directory path
- `GRAPHQL_ENDPOINT_STAGING` - GraphQL API endpoint

#### Production Environment
- `PRODUCTION_SSH_KEY` - SSH private key for production server
- `PRODUCTION_HOST` - Production server hostname/IP
- `PRODUCTION_USER` - SSH username
- `PRODUCTION_DEPLOY_PATH` - Deployment directory path
- `GRAPHQL_ENDPOINT_PRODUCTION` - GraphQL API endpoint

#### Container Registry
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

### Server Requirements

Both staging and production servers need:

1. **Docker and Docker Compose**
   ```bash
   docker --version  # 24.0+
   docker compose version  # v2.0+
   ```

2. **SSH Access**
   - Add deployment SSH key to `~/.ssh/authorized_keys`
   - Ensure user has Docker permissions

3. **Repository Checkout**
   ```bash
   cd /path/to/deploy
   git clone https://github.com/your-org/habitat.git
   ```

4. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

## Usage

### Running CI on Pull Request

1. Create feature branch
2. Make changes
3. Push to GitHub
4. Open pull request to `main`
5. CI runs automatically
6. Review CI results
7. Fix any failures
8. Merge when CI passes

### Deploying to Staging

Automatic on every push to `main`:

```bash
git checkout main
git merge feature-branch
git push origin main
# Staging deployment starts automatically
```

Watch deployment: https://github.com/your-org/habitat/actions

### Deploying to Production

Manual workflow dispatch:

1. Navigate to Actions tab
2. Select "CD - Continuous Deployment"
3. Click "Run workflow"
4. Select branch: `main`
5. Select environment: `production`
6. Click "Run workflow"
7. Monitor deployment progress
8. Verify deployment success

### Running Database Migration

Manual workflow dispatch:

1. Navigate to Actions tab
2. Select "Database Migration"
3. Click "Run workflow"
4. Select environment (staging/production)
5. Select direction (up/down)
6. Click "Run workflow"
7. Monitor migration progress

### Rolling Back Production

If production deployment fails:

1. Automatic rollback triggered
2. Previous Docker images restored
3. Database restored from backup (if migration failed)
4. Health checks verify rollback success

Manual rollback:

```bash
# SSH to production server
ssh user@production-host

# Go to deployment directory
cd /path/to/deploy

# Restore previous images
docker tag habitat-api:rollback habitat-api:latest
docker tag habitat-worker:rollback habitat-worker:latest
docker tag habitat-ui:rollback habitat-ui:latest

# Restart services
docker compose -f docker-compose.prod.yml up -d --force-recreate

# Restore database if needed
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U habitat habitat < backup-YYYYMMDD-HHMMSS.sql
```

## Deployment Strategy

### Zero-Downtime Deployment

**Staging:**
- Pull new images
- Run migrations
- Restart services with new images
- Health checks verify availability

**Production:**
- Blue-green deployment
- Scale up new instances (2x API, 2x worker)
- Wait for health checks (30s)
- Scale down old instances
- Restart UI
- Final health check

### Health Checks

All services include health check endpoints:

- API: `GET /health` (port 4000)
- UI: `GET /` (port 3000)
- PostgreSQL: `pg_isready`
- RabbitMQ: `rabbitmq-diagnostics ping`

### Database Migrations

- Run before service restart
- Automatic backup before migration
- Rollback capability if migration fails
- Migration status verification

## Monitoring

### CI/CD Dashboard

View pipeline status: https://github.com/your-org/habitat/actions

### Deployment Notifications

Configure notifications in GitHub:
- Settings → Notifications
- Watch repository for Actions
- Email or Slack integration

### Logs

View deployment logs in GitHub Actions interface:
1. Navigate to Actions tab
2. Select workflow run
3. Click on job
4. Expand steps to see logs

### Server Logs

SSH to server and view logs:

```bash
cd /path/to/deploy

# View all logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service
docker compose -f docker-compose.prod.yml logs -f api

# View last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100
```

## Troubleshooting

### CI Failures

**Lint errors:**
```bash
pnpm lint --fix
```

**Type errors:**
```bash
pnpm exec tsc --noEmit
```

**Test failures:**
```bash
pnpm test
```

**Build failures:**
Check Docker build logs in GitHub Actions

### Deployment Failures

**SSH connection failed:**
- Verify SSH key is correct
- Check server is accessible
- Verify user has correct permissions

**Health check failed:**
- Check service logs
- Verify all services are running
- Check environment variables

**Database migration failed:**
- Check migration SQL syntax
- Verify database connection
- Review migration logs
- Rollback if needed

### Rollback Issues

If automatic rollback fails:

1. SSH to server
2. Manually restore previous images
3. Restart services
4. Restore database from backup
5. Verify health checks

## Best Practices

### Pull Requests

- Keep PRs small and focused
- Ensure CI passes before requesting review
- Address review feedback
- Rebase on main before merging

### Commits

- Write clear commit messages
- Reference issue numbers
- Atomic commits (one logical change per commit)

### Testing

- Write tests for new features
- Maintain test coverage above 80%
- Test locally before pushing

### Deployments

- Deploy to staging first
- Test thoroughly in staging
- Schedule production deployments during low-traffic periods
- Monitor after deployment
- Have rollback plan ready

### Security

- Never commit secrets
- Use environment variables
- Rotate SSH keys regularly
- Audit dependencies monthly

## Maintenance

### Updating Workflows

1. Edit workflow files in `.github/workflows/`
2. Test changes in feature branch
3. Review workflow run results
4. Merge when validated

### Rotating Secrets

1. Generate new secret
2. Update in GitHub repository settings
3. Update on servers
4. Test deployment
5. Delete old secret

### Scaling

Adjust worker/API instances in deployment scripts:

```bash
# Increase capacity
docker compose -f docker-compose.prod.yml up -d --scale api=3 --scale worker=5

# Decrease capacity
docker compose -f docker-compose.prod.yml up -d --scale api=1 --scale worker=1
```

## Support

- Documentation: https://docs.habitat.eth
- Issues: https://github.com/habitat/habitat/issues
- Discord: https://discord.gg/habitat
