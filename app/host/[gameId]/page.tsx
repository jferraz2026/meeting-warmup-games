'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { GameState } from '@/lib/types'
import { ANSWER_COLORS } from '@/lib/utils'

export default function HostPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const [state, setState] = useState<GameState | null>(null)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [timerActive, setTimerActive] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => { setOrigin(window.location.origin) }, [])

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}/state`)
      if (!res.ok) { setError('Game not found'); return }
      const data: GameState = await res.json()
      setState(data)
    } catch {
      setError('Connection error')
    }
  }, [gameId])

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 1500)
    return () => clearInterval(interval)
  }, [fetchState])

  // Only activate timer for trivia questions
  useEffect(() => {
    if (state?.game.status === 'active' && state.currentQuestion?.question_type === 'trivia') {
      setTimeLeft(30)
      setTimerActive(true)
    } else {
      setTimerActive(false)
    }
  }, [state?.game.current_question_index, state?.game.status, state?.currentQuestion?.question_type])

  useEffect(() => {
    if (!timerActive) return
    if (timeLeft <= 0) { handleShowResults(); return }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [timerActive, timeLeft])

  async function handleStart() {
    setActionLoading(true)
    await fetch(`/api/games/${gameId}/advance`, { method: 'POST' })
    setActionLoading(false)
    fetchState()
  }

  async function handleShowResults() {
    setTimerActive(false)
    await fetch(`/api/games/${gameId}/results`, { method: 'POST' })
    fetchState()
  }

  async function handleNext() {
    setActionLoading(true)
    await fetch(`/api/games/${gameId}/advance`, { method: 'POST' })
    setActionLoading(false)
    fetchState()
  }

  async function handleFinish() {
    setActionLoading(true)
    await fetch(`/api/games/${gameId}/finish`, { method: 'POST' })
    setActionLoading(false)
    fetchState()
  }

  if (error) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-red-400 text-xl">{error}</p>
    </div>
  )

  if (!state) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-white text-xl animate-pulse">Loading...</p>
    </div>
  )

  const { game, currentQuestion, players, answerCounts } = state
  const totalAnswers = answerCounts.reduce((s, a) => s + a.count, 0)
  const joinUrl = `${origin}/play/${game.id}?name=`
  const isLastQuestion = game.current_question_index >= game.question_ids.length - 1
  const isReaction = currentQuestion?.question_type === 'reaction'

  const REACTION_BG = ['bg-yellow-400', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500']

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">🎮 Host Dashboard</h1>
            <p className="text-gray-400 text-sm">
              Question {Math.max(0, game.current_question_index + 1)} of {game.question_ids.length}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-mono font-bold text-indigo-400">{game.code}</div>
            <div className="text-xs text-gray-400">{players.length} player{players.length !== 1 ? 's' : ''} joined</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">

            {/* WAITING */}
            {game.status === 'waiting' && (
              <div className="bg-gray-800 rounded-2xl p-8 text-center">
                <div className="text-5xl mb-4">👋</div>
                <h2 className="text-2xl font-bold mb-2">Waiting for players...</h2>
                <p className="text-gray-400 mb-4">Share this link in your meeting chat:</p>
                <div className="bg-gray-700 rounded-xl px-4 py-3 font-mono text-sm text-indigo-300 break-all mb-2">
                  {joinUrl}
                </div>
                <p className="text-gray-500 text-xs mb-4">Players add their name at the end of the URL, or join at <span className="text-indigo-400">{origin}</span></p>
                <div className="bg-gray-700 rounded-xl p-4 mb-6">
                  <p className="text-sm text-gray-400 mb-1">Game Code</p>
                  <p className="text-4xl font-mono font-bold text-yellow-400 tracking-widest">{game.code}</p>
                </div>
                <button
                  onClick={handleStart}
                  disabled={players.length === 0 || actionLoading}
                  className="px-8 py-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl font-bold rounded-2xl transition-all"
                >
                  {players.length === 0 ? 'Waiting for players...' : '🚀 Start Game!'}
                </button>
              </div>
            )}

            {/* ACTIVE / SHOWING_RESULTS */}
            {(game.status === 'active' || game.status === 'showing_results') && currentQuestion && (
              <div className="space-y-4">
                {/* Header row */}
                <div className="flex items-center gap-4">
                  {!isReaction && game.status === 'active' && (
                    <div className={`text-4xl font-mono font-bold w-16 text-center ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>
                      {timeLeft}
                    </div>
                  )}
                  {isReaction && (
                    <div className="text-2xl">💬</div>
                  )}
                  <div className="flex-1 bg-gray-700 rounded-full h-3">
                    {!isReaction && (
                      <div
                        className="bg-indigo-500 h-3 rounded-full transition-all"
                        style={{ width: `${game.status === 'active' ? (timeLeft / 30) * 100 : 0}%` }}
                      />
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">{totalAnswers}/{players.length} reacted</div>
                </div>

                {/* Question */}
                <div className="bg-gray-800 rounded-2xl p-6">
                  {isReaction && (
                    <p className="text-indigo-400 text-sm mb-2 text-center">💬 Icebreaker — discuss out loud!</p>
                  )}
                  <p className="text-xl font-semibold text-center leading-relaxed">{currentQuestion.text}</p>
                </div>

                {/* Answer options */}
                <div className="grid grid-cols-2 gap-3">
                  {currentQuestion.options.map((opt, i) => {
                    const count = answerCounts.find(a => a.option_index === i)?.count ?? 0
                    const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0
                    const isCorrect = !isReaction && i === currentQuestion.correct_index
                    const showCorrect = game.status === 'showing_results' && !isReaction

                    let bgClass: string
                    if (isReaction) {
                      bgClass = REACTION_BG[i]
                    } else if (showCorrect) {
                      bgClass = isCorrect ? 'bg-green-500' : 'bg-gray-700 opacity-60'
                    } else {
                      bgClass = ANSWER_COLORS[i].bg
                    }

                    return (
                      <div key={i} className={`${bgClass} rounded-xl p-4 relative overflow-hidden transition-all`}>
                        {totalAnswers > 0 && (
                          <div className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all" style={{ width: `${pct}%` }} />
                        )}
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-2xl">{opt}</span>
                          <span className="text-white/90 font-mono text-sm font-bold">
                            {count}{pct > 0 ? ` (${pct}%)` : ''}
                          </span>
                        </div>
                        {showCorrect && isCorrect && (
                          <div className="text-white text-xs mt-1">✓ Correct answer</div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {game.status === 'active' && (
                    <button
                      onClick={handleShowResults}
                      className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl transition-all"
                    >
                      {isReaction ? '📊 Show Reactions' : '📊 Show Results'}
                    </button>
                  )}
                  {game.status === 'showing_results' && (
                    <button
                      onClick={isLastQuestion ? handleFinish : handleNext}
                      disabled={actionLoading}
                      className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
                    >
                      {isLastQuestion ? '🏁 Finish Game' : '➡️ Next Question'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* FINISHED */}
            {game.status === 'finished' && (
              <div className="bg-gray-800 rounded-2xl p-8 text-center">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold mb-2">That's a wrap!</h2>
                <p className="text-gray-400">Great warmup session!</p>
              </div>
            )}
          </div>

          {/* Players sidebar */}
          <div className="bg-gray-800 rounded-2xl p-4">
            <h3 className="font-bold text-gray-300 mb-3 flex items-center gap-2">
              <span>👥</span> Players
            </h3>
            <div className="space-y-2">
              {players.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No players yet</p>
              )}
              {players.map((player, i) => (
                <div key={player.id} className="flex items-center gap-3 py-2 border-b border-gray-700 last:border-0">
                  <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                  <span className="flex-1 font-medium truncate">{player.name}</span>
                  <span className="text-indigo-400 font-mono text-sm font-bold">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
