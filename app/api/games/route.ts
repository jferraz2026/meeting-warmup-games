import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { generateGameCode } from '@/lib/utils'
import { Question } from '@/lib/types'

export async function POST() {
  try {
    const questions = await query<Question>('SELECT id FROM questions')
    const shuffled = [...questions].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, 8).map((q) => q.id)

    const code = generateGameCode()
    const result = await query(
      `INSERT INTO games (code, status, current_question_index, question_ids)
       VALUES ($1, 'waiting', -1, $2::jsonb) RETURNING *`,
      [code, JSON.stringify(selected)]
    )
    return NextResponse.json(result[0])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
