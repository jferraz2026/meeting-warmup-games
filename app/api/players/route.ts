import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { game_id, name } = await req.json()
    const existing = await query(
      'SELECT * FROM players WHERE game_id = $1 AND name = $2',
      [game_id, name]
    )
    if (existing.length) return NextResponse.json(existing[0])
    const result = await query(
      `INSERT INTO players (game_id, name, score) VALUES ($1, $2, 0) RETURNING *`,
      [game_id, name]
    )
    return NextResponse.json(result[0])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
