'use client'
import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { GameState, Player } from '@/lib/types'
import { ANSWER_COLORS, REACTION_EMOJIS, REACTION_COLORS } from '@/lib/utils'

const AVATARS = ['🐶','🐱','🐻','🦊','🐼','🦁','🐮','🐷','🐸','🦋','🦄','🦅','🌟','🎭','🚀','🎸','🍕','☕','🌈','⚡']

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

  const [playerId, setPlayerId] = useState<string | null>(null)
  const [state, setState] = useState<GameState | null>(null)
  const [registered, setRegistered] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const playerIdRef = useRef<string | null>(null)

  // Join screen state
  const [playerName, setPlayerName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0])
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem(`player_${gameId}`)
    if (stored) {
      setPlayerId(stored)
      playerIdRef.current = stored
      setRegistered(true)
    }
  }, [gameId])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!playerName.trim()) return
    setJoining(true)
    setJoinError('')
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, name: playerName.trim(), avatar: selectedAvatar }),
      })
      const player: Player = await res.json()
      if (!player.id) throw new Error('Failed to join')
      sessionStorage.setItem(`player_${gameId}`, player.id)
      setPlayerId(player.id)
      playerIdRef.current = player.id
      setRegistered(true)
    } catch {
      setJoinError('Could not join the game. Please try again.')
    } finally {
      setJoining(false)
    }
  }

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

  // JOIN SCREEN
  if (!registered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🎮</div>
            <h1 className="text-2xl font-bold text-white">Join the Game!</h1>
            <p className="text-indigo-300 text-sm mt-1">Pick an avatar and enter your name</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-5">
            {/* Avatar picker */}
            <div>
              <p className="text-indigo-300 text-sm mb-2 text-center">Choose your avatar</p>
              <div className="grid grid-cols-5 gap-2">
                {AVATARS.map(av => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`text-3xl p-2 rounded-xl transition-all ${
                      selectedAvatar === av
                        ? 'bg-indigo-500 ring-2 ring-white scale-110'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
              <p className="text-center text-4xl mt-3">{selectedAvatar}</p>
            </div>

            {/* Name input */}
            <div>
              <label className="block text-indigo-300 text-sm mb-1">Your name</label>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-indigo-400 text-center text-lg"
              />
            </div>

            {joinError && <p className="text-red-400 text-sm text-center">{joinError}</p>}

            <button
              type="submit"
              disabled={joining || !playerName.trim()}
              className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xl font-bold rounded-2xl transition-all"
            >
              {joining ? '⏳ Joining...' : '🚀 Join Game!'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (error) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-5xl mb-4">😬</div>
        <p className="text-red-400 text-xl">{error}</p>
      </div>
    </div>
  )

  if (!state) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-bounce">🎮</div>
        <p className="text-white text-xl animate-pulse">Joining game...</p>
      </div>
    </div>
  )

  const { game, currentQuestion, players, myAnswer } = state
  const myPlayer = players.find(p => p.id === playerId)
  const isReaction = currentQuestion?.question_type === 'reaction'
  const showingResults = game.status === 'showing_results'
  const hasAnswered = myAnswer !== null

  if (game.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">{selectedAvatar || myPlayer?.avatar || '🎮'}</div>
          <h1 className="text-3xl font-bold text-white mb-1">You're in!</h1>
          <p className="text-indigo-300 text-lg mb-6">
            Welcome, <span className="font-bold text-white">{myPlayer?.name || playerName}</span>!
          </p>
          <div className="bg-white/10 rounded-2xl p-6 mb-4">
            <p className="text-indigo-300 mb-3">Waiting for the host to start...</p>
            <div className="flex gap-1 justify-center">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1">
                <span>{p.avatar}</span>
                <span className="text-white text-sm">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (game.status === 'finished') {
    const sorted = [...players].sort((a, b) => b.score - a.score)
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center w-full max-w-sm">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-white mb-1">That's a wrap!</h1>
          <p className="text-indigo-300 mb-6">Great warmup session!</p>
          <div className="bg-white/10 rounded-2xl p-4 space-y-2">
            {sorted.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl ${p.id === playerId ? 'bg-white/10' : ''}`}>
                <span className="text-xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
                <span className="text-2xl">{p.avatar}</span>
                <span className="flex-1 text-white font-medium truncate">{p.name}</span>
                <span className="text-yellow-400 font-bold">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!currentQuestion) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-white animate-pulse">Loading question...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col p-4">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{selectedAvatar || myPlayer?.avatar || '🎮'}</span>
          <span className="text-gray-400 text-sm">{myPlayer?.name || playerName}</span>
        </div>
        {myPlayer && myPlayer.score > 0 && (
          <span className="text-indigo-400 font-bold">{myPlayer.score} pts</span>
        )}
      </div>

      {/* Question */}
      <div className="bg-gray-800 rounded-2xl p-6 mb-4 flex-shrink-0">
        {isReaction && (
          <p className="text-indigo-400 text-xs mb-2 text-center">💬 Discuss out loud!</p>
        )}
        <p className="text-white text-xl font-semibold text-center leading-relaxed">
          {currentQuestion.text}
        </p>
      </div>

      {/* REACTION question — active: listening state, showing_results: emoji buttons */}
      {isReaction && game.status === 'active' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">👂</div>
            <p className="text-white text-lg font-medium">Listen & discuss!</p>
            <p className="text-gray-400 text-sm mt-1">Emoji reactions coming soon...</p>
          </div>
        </div>
      )}

      {isReaction && showingResults && (
        <div className="flex-1 flex flex-col">
          {hasAnswered ? (
            <div className="text-center mb-4">
              <p className="text-green-400 font-bold text-lg">{REACTION_EMOJIS[myAnswer!]} Reaction sent!</p>
              <p className="text-gray-400 text-sm">Waiting for others...</p>
            </div>
          ) : (
            <p className="text-center text-indigo-300 text-sm mb-4">How did that make you feel?</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {REACTION_EMOJIS.map((emoji, i) => {
              const rc = REACTION_COLORS[i]
              const isMyAnswer = myAnswer === i
              let bgClass = `${rc.bg} ${!hasAnswered ? rc.hover : ''}`
              if (hasAnswered && isMyAnswer) bgClass = `${rc.bg} ring-4 ring-white scale-105`
              if (hasAnswered && !isMyAnswer) bgClass = 'bg-gray-700 opacity-40'
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={hasAnswered || submitting}
                  className={`${bgClass} rounded-2xl p-6 flex flex-col items-center justify-center transition-all active:scale-95 disabled:cursor-default min-h-[130px]`}
                >
                  <span className="text-5xl">{emoji}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* TRIVIA question */}
      {!isReaction && (
        <div className="flex-1 flex flex-col">
          {hasAnswered && !showingResults && (
            <div className="text-center mb-4">
              <p className="text-green-400 font-bold text-lg">✅ Answer locked in!</p>
              <p className="text-gray-400 text-sm">Waiting for others...</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {currentQuestion.options.map((opt, i) => {
              const color = ANSWER_COLORS[i]
              const isCorrect = i === currentQuestion.correct_index
              let bgClass = `${color.bg} ${!hasAnswered ? color.hover : ''}`
              if (showingResults) {
                bgClass = isCorrect ? 'bg-green-500' : 'bg-gray-700 opacity-50'
              } else if (hasAnswered && myAnswer === i) {
                bgClass = `${color.bg} ring-4 ring-white`
              } else if (hasAnswered && myAnswer !== i) {
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
                  <span className={`font-bold text-center text-sm leading-tight ${color.text}`}>{opt}</span>
                  {showingResults && isCorrect && <span className="text-white text-xs">✓ Correct!</span>}
                  {showingResults && myAnswer === i && !isCorrect && <span className="text-gray-300 text-xs">Your answer</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
