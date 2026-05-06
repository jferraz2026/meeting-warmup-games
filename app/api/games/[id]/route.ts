import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const games = await query('SELECT * FROM games WHERE id = $1', [params.id])
    if (!games.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(games[0])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const fields = Object.keys(body)
    const values = Object.values(body)
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ')
    const result = await query(
      `UPDATE games SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values as (string | number)[], params.id]
    )
    return NextResponse.json(result[0])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
