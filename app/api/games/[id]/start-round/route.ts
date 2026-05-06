import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Game, Player, Question } from '@/lib/types'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const games = await query<Game>('SELECT * FROM games WHERE id = $1', [params.id])
    if (!games.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const game = games[0]

    const players = await query<Player>('SELECT * FROM players WHERE game_id = $1', [params.id])
    if (!players.length) return NextResponse.json({ error: 'No players' }, { status: 400 })

    const playerOrder = shuffle(players).map(p => p.id)
    const numPlayers = players.length

    const allQuestions = await query<Question>('SELECT id FROM questions')
    const usedIds: string[] = game.used_question_ids || []

    let available = allQuestions.filter(q => !usedIds.includes(q.id))
    // If not enough unused questions, reset the used list
    if (available.length < numPlayers) {
      available = shuffle(allQuestions)
    }

    const selectedQuestions = shuffle(available).slice(0, numPlayers)
    const selectedIds = selectedQuestions.map(q => q.id)
    const newUsedIds = available.length < numPlayers
      ? selectedIds  // reset case
      : [...usedIds, ...selectedIds]

    const result = await query(
      `UPDATE games SET
        player_order = $1::jsonb,
        question_ids = $2::jsonb,
        used_question_ids = $3::jsonb,
        current_question_index = 0,
        round_number = round_number + 1,
        status = 'active'
       WHERE id = $4 RETURNING *`,
      [JSON.stringify(playerOrder), JSON.stringify(selectedIds), JSON.stringify(newUsedIds), params.id]
    )
    return NextResponse.json(result[0])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
