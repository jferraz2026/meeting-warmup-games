export interface Question {
  id: string
  text: string
  options: string[]
  correct_index: number | null
  question_type: 'trivia' | 'reaction'
  created_at: string
}

export interface Game {
  id: string
  code: string
  status: 'waiting' | 'active' | 'round_complete' | 'finished'
  current_question_index: number
  question_ids: string[]
  player_order: string[]
  used_question_ids: string[]
  round_number: number
  created_at: string
}

export interface Player {
  id: string
  game_id: string
  name: string
  avatar: string
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
  currentAnswererId: string | null
  players: Player[]
  answerCounts: { option_index: number; count: number }[]
  myAnswer: number | null
  turnNumber: number
  totalTurns: number
}
