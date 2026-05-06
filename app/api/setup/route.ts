import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`)

    await query(`
      CREATE TABLE IF NOT EXISTS questions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        text TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_index INTEGER,
        question_type TEXT DEFAULT 'trivia' CHECK (question_type IN ('trivia', 'reaction')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Add question_type column if it doesn't exist (for existing DBs)
    await query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'trivia' CHECK (question_type IN ('trivia', 'reaction'))`)
    // Make correct_index nullable if it isn't already
    await query(`ALTER TABLE questions ALTER COLUMN correct_index DROP NOT NULL`).catch(() => {})

    await query(`
      CREATE TABLE IF NOT EXISTS games (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'showing_results', 'finished')),
        current_question_index INTEGER DEFAULT -1,
        question_ids JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await query(`
      CREATE TABLE IF NOT EXISTS players (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        game_id UUID REFERENCES games(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        avatar TEXT DEFAULT '🐶',
        score INTEGER DEFAULT 0,
        joined_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '🐶'`)

    await query(`
      CREATE TABLE IF NOT EXISTS answers (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        game_id UUID REFERENCES games(id) ON DELETE CASCADE,
        question_id UUID REFERENCES questions(id),
        player_id UUID REFERENCES players(id) ON DELETE CASCADE,
        option_index INTEGER NOT NULL,
        is_correct BOOLEAN NOT NULL DEFAULT false,
        answered_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(game_id, question_id, player_id)
      )
    `)

    await query(`CREATE INDEX IF NOT EXISTS idx_games_code ON games(code)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_answers_game_question ON answers(game_id, question_id)`)

    // Only reseed if no reaction questions exist yet
    const existing = await query(`SELECT COUNT(*)::int as count FROM questions WHERE question_type = 'reaction'`)
    const hasReactionQuestions = (existing[0] as { count: number }).count > 0
    if (hasReactionQuestions) {
      const final = await query('SELECT COUNT(*)::int as count FROM questions')
      return NextResponse.json({ ok: true, message: 'Database ready', questions: (final[0] as { count: number }).count })
    }

    // Delete old trivia-only questions (safe to delete since no game is using them)
    await query(`DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE question_type = 'trivia')`)
    await query(`DELETE FROM questions WHERE question_type = 'trivia'`)

    await query(`
      INSERT INTO questions (text, options, correct_index, question_type) VALUES
      ('If your life had release notes, what would be in the latest update?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('What was the last thing you googled symptoms for to check if you had it?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('If you could have an unlimited supply of something for the rest of your life, what would it be?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('What''s something completely useless that you still have memorized?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('What was the favorite part of your week so far?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('Fill in the sentence: I admire people who... I could never...', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('If you had a real-life "mute" button, who or what would you use it on first?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('What''s your current Zoom background hiding?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('You have to wear a t-shirt with a word on it for a year, what word would you choose?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('What''s a weird habit you didn''t realize you had until someone pointed it out?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('If you could instantly become an expert in something, what would it be?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('If you could have any superhero quality, what would it be?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('What''s something you appreciate about one of your teammates?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('If you were a ghost, how would you haunt people?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('What''s the weirdest thing you believed as a kid?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('If you could permanently delete one work app (Slack, Teams, Jira, etc.), which one would it be and why?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('What''s your most useless talent?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('What notification sound gives you the most anxiety?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('What''s the weirdest food combination you enjoy?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('If you could invite any celebrity to dinner, who would it be?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('When you leave a company, what would you like to be remembered for?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('What''s the smallest hill you''ll die on?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('What non-work website would most likely show up in your browser history?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('What''s the biggest lie phrase in the corporate world?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('What''s your favorite work-related meme/GIF?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('What corporate acronym or word makes the least sense to you?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('What would you do if your boss texted you at 3am asking you to bail them out of jail?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('If you could swap jobs with someone from the company, who would it be?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('Would you rather: Join a "quick sync" that lasts an hour, or write a detailed report no one will ever read?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('Would you rather: Forget your camera''s on while making weird faces, or forget to mute yourself during a rant?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('Would you rather: Fill out a 3-page timesheet every Friday, or watch mandatory compliance videos with unskippable quizzes?', '["😄","😅","🤔","😂"]', NULL, 'reaction'),
      ('Would you rather: Have your camera on during weird stretches in front of the whole company, or have your phone unmuted playing embarrassing sounds during a team call?', '["😄","😅","🤔","😂"]', NULL, 'reaction')
    `)

    const final = await query('SELECT COUNT(*)::int as count FROM questions')
    return NextResponse.json({ ok: true, message: 'Database ready', questions: (final[0] as { count: number }).count })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
