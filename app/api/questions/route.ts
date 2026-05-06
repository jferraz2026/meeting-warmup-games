import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const questions = await query('SELECT * FROM questions ORDER BY created_at DESC')
    return NextResponse.json(questions)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { text, options, correct_index } = await req.json()
    const result = await query(
      `INSERT INTO questions (text, options, correct_index) VALUES ($1, $2, $3) RETURNING *`,
      [text, JSON.stringify(options), correct_index]
    )
    return NextResponse.json(result[0])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
