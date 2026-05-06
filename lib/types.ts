export interface Question {
  id: string
  text: string
  options: string[]
  correct_index: number
  created_at: string
}

export interface Game {
  id: string
  code: string
  status: 'waiting' | 'active' | 'showing_results' | 'finished'
  current_question_index: number
  question_ids: string[]
  created_at: string
}

export interface Player {
  id: string
  game_id: string
  name: string
  score: number
  joined_at: string
}

export interface Answer {
  id: string
  game_id: string
  question_id: string
  player_id: string
  option_index: number
  is_correct: boolean
  answered_at: string
}

export interface GameState {
  game: Game
  currentQuestion: Question | null
  players: Player[]
  answerCounts: { option_index: number; count: number }[]
  myAnswer: number | null
}
