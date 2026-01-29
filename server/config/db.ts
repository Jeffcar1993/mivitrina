import dotenv from 'dotenv';
import { Pool } from 'pg';
import type { QueryResult } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

export const query = (text: string, params?: any[]): Promise<QueryResult<any>> => {
  return pool.query(text, params);
};