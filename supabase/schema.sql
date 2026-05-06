-- ============================================================
-- Meeting Warmup Quiz Game - Supabase Schema
-- Run this in your Supabase SQL editor to set up the database
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- Questions bank
create table if not exists questions (
  id uuid default gen_random_uuid() primary key,
  text text not null,
  options jsonb not null,  -- array of 4 strings
  correct_index integer not null check (correct_index >= 0 and correct_index <= 3),
  created_at timestamptz default now()
);

-- Games
create table if not exists games (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  status text default 'waiting' check (status in ('waiting', 'active', 'showing_results', 'finished')),
  current_question_index integer default -1,
  question_ids uuid[] default '{}',
  created_at timestamptz default now()
);

-- Players
create table if not exists players (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references games(id) on delete cascade,
  name text not null,
  score integer default 0,
  joined_at timestamptz default now()
);

-- Answers
create table if not exists answers (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references games(id) on delete cascade,
  question_id uuid references questions(id),
  player_id uuid references players(id) on delete cascade,
  option_index integer not null,
  is_correct boolean not null,
  answered_at timestamptz default now(),
  unique(game_id, question_id, player_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table questions enable row level security;
alter table games enable row level security;
alter table players enable row level security;
alter table answers enable row level security;

-- Policies: allow all operations via anon key (warmup game, not sensitive data)
create policy "Allow all on questions" on questions for all using (true) with check (true);
create policy "Allow all on games" on games for all using (true) with check (true);
create policy "Allow all on players" on players for all using (true) with check (true);
create policy "Allow all on answers" on answers for all using (true) with check (true);

-- ============================================================
-- REAL-TIME
-- ============================================================

-- Enable real-time for the tables players need to subscribe to
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table answers;

-- ============================================================
-- SEED DATA - 12 sample questions
-- ============================================================

insert into questions (text, options, correct_index) values
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
('Which element has the atomic number 1?', '["Helium", "Oxygen", "Hydrogen", "Carbon"]', 2);
