'use client'
import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { GameState, Player } from '@/lib/types'
import { ANSWER_COLORS } from '@/lib/utils'

export default function PlayPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-xl animate-pulse">Loading...</p>
      </div>
    }>
      <PlayPage />
    </Suspense>
  )
}

function PlayPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const searchParams = useSearchParams()
  const playerName = searchParams.get('name') || 'Player'

  const [playerId, setPlayerId] = useState<string | null>(null)
  const [state, setState] = useState<GameState | null>(null)
  const [registered, setRegistered] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const playerIdRef = useRef<string | null>(null)

  // Register player on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(`player_${gameId}`)
    if (stored) {
      setPlayerId(stored)
      playerIdRef.current = stored
      setRegistered(true)
      return
    }

    async function register() {
      try {
        const res = await fetch('/api/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game_id: gameId, name: playerName }),
        })
        const player: Player = await res.json()
        sessionStorage.setItem(`player_${gameId}`, player.id)
        setPlayerId(player.id)
        playerIdRef.current = player.id
        setRegistered(true)
      } catch {
        setError('Failed to join game. Please try again.')
      }
    }
    register()
  }, [gameId, playerName])

  const fetchState = useCallback(async () => {
    if (!playerIdRef.current) return
    try {
      const res = await fetch(`/api/games/${gameId}/state?player_id=${playerIdRef.current}`)
      if (!res.ok) { setError('Game not found'); return }
      const data: GameState = await res.json()
      setState(data)
    } catch {
      setError('Connection error')
    }
  }, [gameId])

  useEffect(() => {
    if (!registered) return
    fetchState()
    const interval = setInterval(fetchState, 1500)
    return () => clearInterval(interval)
  }, [registered, fetchState])

  async function handleAnswer(optionIndex: number) {
    if (!playerId || !state?.currentQuestion || state.myAnswer !== null || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          question_id: state.currentQuestion.id,
          player_id: playerId,
          option_index: optionIndex,
        }),
      })
      await fetchState()
    } finally {
      setSubmitting(false)
    }
  }

  if (error) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-5xl mb-4">😬</div>
        <p className="text-red-400 text-xl">{error}</p>
      </div>
    </div>
  )

  if (!registered || !state) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-bounce">🎮</div>
        <p className="text-white text-xl animate-pulse">Joining game...</p>
      </div>
    </div>
  )

  const { game, currentQuestion, players, myAnswer } = state
  const myPlayer = players.find(p => p.id === playerId)

  // WAITING
  if (game.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-6 animate-bounce">👋</div>
          <h1 className="text-3xl font-bold text-white mb-2">You're in!</h1>
          <p className="text-indigo-300 text-xl mb-8">Welcome, <span className="font-bold text-white">{playerName}</span>!</p>
          <div className="bg-white/10 rounded-2xl p-6 mb-6">
            <p className="text-indigo-300 mb-2">Waiting for the host to start...</p>
            <div className="flex gap-1 justify-center mt-3">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
          <p className="text-indigo-400 text-sm">{players.length} player{players.length !== 1 ? 's' : ''} in the lobby</p>
        </div>
      </div>
    )
  }

  // FINISHED
  if (game.status === 'finished') {
    const sorted = [...players].sort((a, b) => b.score - a.score)
    const myRank = sorted.findIndex(p => p.id === playerId) + 1
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center w-full max-w-sm">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-3xl font-bold text-white mb-1">Game Over!</h1>
          <p className="text-indigo-300 mb-6">You finished #{myRank} with {myPlayer?.score ?? 0} points</p>
          <div className="bg-white/10 rounded-2xl p-4 space-y-3">
            {sorted.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl ${p.id === playerId ? 'bg-white/10' : ''}`}>
                <span className="text-xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
                <span className="flex-1 text-white font-medium truncate">{p.name}</span>
                <span className="text-yellow-400 font-bold">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ACTIVE or SHOWING_RESULTS
  if (!currentQuestion) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-white animate-pulse">Loading question...</p>
    </div>
  )

  const showingResults = game.status === 'showing_results'

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col p-4">
      {/* Score bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-gray-400 text-sm">{playerName}</span>
        <span className="text-indigo-400 font-bold">{myPlayer?.score ?? 0} pts</span>
      </div>

      {/* Question */}
      <div className="bg-gray-800 rounded-2xl p-6 mb-6 flex-shrink-0">
        <p className="text-white text-xl font-semibold text-center leading-relaxed">
          {currentQuestion.text}
        </p>
      </div>

      {/* Status message */}
      {myAnswer !== null && !showingResults && (
        <div className="text-center mb-4">
          <p className="text-green-400 font-bold text-lg">✅ Answer locked in!</p>
          <p className="text-gray-400 text-sm">Waiting for others...</p>
        </div>
      )}

      {/* Answer buttons */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {currentQuestion.options.map((opt, i) => {
          const color = ANSWER_COLORS[i]
          const isMyAnswer = myAnswer === i
          const isCorrect = i === currentQuestion.correct_index
          const hasAnswered = myAnswer !== null

          let bgClass = `${color.bg} ${!hasAnswered ? color.hover : ''}`
          if (showingResults) {
            bgClass = isCorrect ? 'bg-green-500' : 'bg-gray-700 opacity-50'
          } else if (hasAnswered && isMyAnswer) {
            bgClass = `${color.bg} ring-4 ring-white`
          } else if (hasAnswered && !isMyAnswer) {
            bgClass = 'bg-gray-700 opacity-40'
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={hasAnswered || submitting || showingResults}
              className={`${bgClass} rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:cursor-default min-h-[120px]`}
            >
              <span className={`text-3xl ${color.text}`}>{color.label}</span>
              <span className={`font-bold text-center text-sm leading-tight ${color.text} ${showingResults && !isCorrect ? 'text-gray-300' : ''}`}>
                {opt}
              </span>
              {showingResults && isCorrect && (
                <span className="text-white text-xs">✓ Correct!</span>
              )}
              {showingResults && isMyAnswer && !isCorrect && (
                <span className="text-gray-300 text-xs">Your answer</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
