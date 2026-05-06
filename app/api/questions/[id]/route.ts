import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { text, options, correct_index } = await req.json()
    const result = await query(
      `UPDATE questions SET text = $1, options = $2, correct_index = $3 WHERE id = $4 RETURNING *`,
      [text, JSON.stringify(options), correct_index, params.id]
    )
    return NextResponse.json(result[0])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await query('DELETE FROM questions WHERE id = $1', [params.id])
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
