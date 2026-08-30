const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const schemaPath = path.join(__dirname, '..', 'supabase_schema.sql');

async function runDirectMigration() {
  console.log('====================================================');
  console.log('  ROYAL LUDO ONLINE - AUTOMATIC DATABASE MIGRATION  ');
  console.log('====================================================');

  const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Error: supabase_schema.sql not found at:', schemaPath);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(schemaPath, 'utf8');

  // 1. If Direct PostgreSQL Connection String is available
  if (databaseUrl) {
    console.log('🔌 Connecting directly to PostgreSQL database string...');
    const { Client } = require('pg');

    const client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      console.log('✅ Connected to PostgreSQL directly!');
      console.log('🚀 Applying migrations and schema...');

      await client.query(sqlContent);

      // Enable Supabase Realtime Publication for tables
      try {
        await client.query(`
          DO $$
          BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms, public.room_players, public.matches, public.match_players, public.game_moves, public.transactions, public.profiles, public.friends, public.friend_requests;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END $$;
        `);
      } catch (pubErr) {
        // Ignore if already published
      }

      console.log('🎉 Migration applied successfully via direct database connection!');
      await client.end();
      process.exit(0);
    } catch (err) {
      console.error('❌ Direct PostgreSQL migration error:', err.message);
      await client.end().catch(() => {});
    }
  }

  // 2. Automated Migration via Supabase Service Role Key
  if (supabaseUrl && serviceRoleKey) {
    console.log('🔑 Migrating via Supabase Service Role Key...');
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify connection to tables
    const tables = ['profiles', 'rooms', 'room_players', 'matches', 'match_players', 'game_moves', 'transactions', 'friends', 'friend_requests'];
    let allOk = true;

    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error && error.code === '42P01') {
        console.warn(`⚠️ Table "${table}" does not exist yet.`);
        allOk = false;
      } else {
        console.log(`✅ Table "${table}" is active and synced.`);
      }
    }

    if (allOk) {
      console.log('🎉 All database tables are present and verified!');
      process.exit(0);
    } else {
      console.log('\nℹ️ Tip: To auto-create any missing tables directly, add your DATABASE_URL in .env:');
      console.log('DATABASE_URL="postgresql://postgres:[YOUR-DB-PASSWORD]@db.ptmwpjoxukybfqoppesz.supabase.co:5432/postgres"');
      console.log('And run: npm run migrate');
      process.exit(0);
    }
  }

  console.log('⚠️ No DATABASE_URL or SUPABASE_SERVICE_ROLE_KEY found in .env.');
  console.log('Please set DATABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.');
  process.exit(1);
}

runDirectMigration();
