import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: { code: string } }) {
  try {
    const games = await query('SELECT * FROM games WHERE code = $1', [params.code.toUpperCase()])
    if (!games.length) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    return NextResponse.json(games[0])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
