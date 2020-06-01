import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'data',
  password: 'postgres',
  port: 5432,
  connectionTimeoutMillis: 30000
});

export default pool;

export const postgresReady = async () => {
  console.log('Waiting for postgres to be ready... This may take longer on first start.')
  const start = Date.now();
  
  while (true) {
    try {
      await pool.connect();
      console.log('Postgres ready.')
      return;
    } catch (e) {
      if (Date.now() - start < 60000) {
        continue;
      }
  
      console.error('Unable to connect to postgres', e);
      return process.exit(1);
    }
  }
};