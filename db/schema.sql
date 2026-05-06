-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Questions bank
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INTEGER NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'showing_results', 'finished')),
  current_question_index INTEGER DEFAULT -1,
  question_ids JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Answers
CREATE TABLE IF NOT EXISTS answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, question_id, player_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_games_code ON games(code);
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_answers_game_question ON answers(game_id, question_id);

-- Seed with 12 sample questions
INSERT INTO questions (text, options, correct_index) VALUES
('What is the capital of France?', '["London", "Berlin", "Paris", "Madrid"]', 2),
('How many sides does a hexagon have?', '["5", "6", "7", "8"]', 1),
('Which planet is known as the Red Planet?', '["Venus", "Jupiter", "Mars", "Saturn"]', 2),
('What is 12 × 12?', '["124", "144", "132", "148"]', 1),
('Who painted the Mona Lisa?', '["Michelangelo", "Raphael", "Da Vinci", "Botticelli"]', 2),
('What is the largest ocean on Earth?', '["Atlantic", "Indian", "Arctic", "Pacific"]', 3),
('In what year did the Berlin Wall fall?', '["1987", "1989", "1991", "1993"]', 1),
('What is the chemical symbol for gold?', '["Gl", "Go", "Au", "Ag"]', 2),
('Which country invented pizza?', '["Greece", "Spain", "France", "Italy"]', 3),
('How many bones are in the adult human body?', '["196", "206", "216", "226"]', 1),
('What is the fastest land animal?', '["Lion", "Cheetah", "Leopard", "Gazelle"]', 1),
('Which element has the atomic number 1?', '["Helium", "Oxygen", "Hydrogen", "Carbon"]', 2)
ON CONFLICT DO NOTHING;
