const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function findMigrationsDir() {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'db', 'migrations');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const MIGRATIONS_DIR = findMigrationsDir();

async function main() {
  if (!MIGRATIONS_DIR) throw new Error('db/migrations directory not found');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    const { rows } = await client.query('select name from schema_migrations');
    const applied = new Set(rows.map((r) => r.name));

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      try {
        await client.query('begin');
        await client.query(sql);
        await client.query('insert into schema_migrations (name) values ($1)', [file]);
        await client.query('commit');
        console.log('migrated:', file);
      } catch (error) {
        await client.query('rollback');
        throw new Error(`Migration ${file} failed: ${error.message}`);
      }
    }
    console.log('migrations up to date');
  } finally {
    await client.end();
  }
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
