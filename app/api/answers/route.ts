import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Question, Answer } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const { game_id, question_id, player_id, option_index } = await req.json()

    const questions = await query<Question>('SELECT * FROM questions WHERE id = $1', [question_id])
    if (!questions.length) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    const question = questions[0]
    const is_correct = option_index === question.correct_index

    const existing = await query<Answer>(
      'SELECT * FROM answers WHERE game_id = $1 AND question_id = $2 AND player_id = $3',
      [game_id, question_id, player_id]
    )
    if (existing.length) return NextResponse.json(existing[0])

    const result = await query(
      `INSERT INTO answers (game_id, question_id, player_id, option_index, is_correct)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [game_id, question_id, player_id, option_index, is_correct]
    )

    if (is_correct) {
      await query(
        'UPDATE players SET score = score + 100 WHERE id = $1',
        [player_id]
      )
    }

    return NextResponse.json(result[0])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
