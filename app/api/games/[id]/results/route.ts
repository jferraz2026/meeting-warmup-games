import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await query(
      `UPDATE games SET status = 'showing_results' WHERE id = $1 RETURNING *`,
      [params.id]
    )
    return NextResponse.json(result[0])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
