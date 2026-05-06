import { Pool } from 'pg'

declare global {
  var _pgPool: Pool | undefined
}

export function getPool(): Pool {
  if (!global._pgPool) {
    global._pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  }
  return global._pgPool
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: (string | number | boolean | null | string[])[]
): Promise<T[]> {
  const pool = getPool()
  const result = await pool.query(text, params)
  return result.rows as T[]
}
