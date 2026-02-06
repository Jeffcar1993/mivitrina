import dotenv from 'dotenv';
import { Pool } from 'pg';
import type { QueryResult } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

export const query = (text: string, params?: any[]): Promise<QueryResult<any>> => {
  return pool.query(text, params);
};