import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Game, Question, Player, Answer } from '@/lib/types'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const playerId = searchParams.get('player_id')

    const games = await query<Game>('SELECT * FROM games WHERE id = $1', [params.id])
    if (!games.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const game = games[0]

    let currentQuestion: Question | null = null
    let answerCounts: { option_index: number; count: number }[] = []
    let myAnswer: number | null = null

    if (game.current_question_index >= 0 && game.question_ids.length > 0) {
      const questionId = game.question_ids[game.current_question_index]
      const questions = await query<Question>('SELECT * FROM questions WHERE id = $1', [questionId])
      if (questions.length) currentQuestion = questions[0]

      const counts = await query<{ option_index: string; count: string }>(
        `SELECT option_index, COUNT(*)::int as count FROM answers
         WHERE game_id = $1 AND question_id = $2 GROUP BY option_index`,
        [params.id, questionId]
      )
      answerCounts = counts.map((c) => ({ option_index: Number(c.option_index), count: Number(c.count) }))

      if (playerId) {
        const myAnswers = await query<Answer>(
          `SELECT option_index FROM answers WHERE game_id = $1 AND question_id = $2 AND player_id = $3`,
          [params.id, questionId, playerId]
        )
        if (myAnswers.length) myAnswer = myAnswers[0].option_index
      }
    }

    const players = await query<Player>(
      'SELECT * FROM players WHERE game_id = $1 ORDER BY score DESC, joined_at ASC',
      [params.id]
    )

    return NextResponse.json({ game, currentQuestion, players, answerCounts, myAnswer })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
