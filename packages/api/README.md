# @habitat/api

GraphQL API server for Habitat patronage accounting system.

## Database Providers

The API supports two database providers:

### Supabase (Low-Code, Recommended)

Supabase provides database, auth, RLS, and realtime out of the box.

```bash
DATABASE_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

**Advantages:**
- Automatic auth and RLS
- Realtime subscriptions
- Auto-generated REST API
- Managed backups and scaling
- Edge Functions for custom logic

### PostgreSQL (Self-Hosted)

Direct PostgreSQL connection for self-hosted deployments.

```bash
DATABASE_PROVIDER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=habitat
DB_USER=postgres
DB_PASSWORD=your-password
```

**Advantages:**
- Full control over infrastructure
- No vendor lock-in
- Custom extensions and optimizations

## Development

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Then start the server
pnpm dev
```

## Database Migrations

### Supabase

Migrations are managed via Supabase CLI or dashboard:

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize project
supabase init

# Create migration
supabase migration new initial_schema

# Apply migrations
supabase db push
```

### PostgreSQL

Migrations run automatically on server start:

```bash
pnpm start
# Migrations from ../schema/ are applied in order
```

Or run manually:

```typescript
import { runMigrations } from './db/migrations.js'
import { createDatabaseClient } from './db/client.js'

const pool = await createDatabaseClient(config.database)
await runMigrations(pool, './schema')
```

## Sprint 63 Deliverable

✓ Database client abstraction (Supabase or PostgreSQL)
✓ Connection pool configuration
✓ Migration runner for self-hosted deployments
✓ Health check utility
✓ Environment configuration with dual-provider support

---

Part of Habitat v0.3.3 — Foundation block
