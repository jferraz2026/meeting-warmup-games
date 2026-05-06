import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Game } from '@/lib/types'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const games = await query<Game>('SELECT * FROM games WHERE id = $1', [params.id])
    if (!games.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const game = games[0]

    const nextIndex = game.current_question_index + 1
    const totalTurns = (game.player_order || []).length

    if (nextIndex >= totalTurns) {
      const result = await query(
        `UPDATE games SET status = 'round_complete' WHERE id = $1 RETURNING *`,
        [params.id]
      )
      return NextResponse.json(result[0])
    }

    const result = await query(
      `UPDATE games SET current_question_index = $1 WHERE id = $2 RETURNING *`,
      [nextIndex, params.id]
    )
    return NextResponse.json(result[0])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
