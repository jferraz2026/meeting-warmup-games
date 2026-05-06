'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { GameState, Player } from '@/lib/types'
import { REACTION_EMOJIS, REACTION_COLORS } from '@/lib/utils'

const AVATARS = ['🐶','🐱','🐻','🦊','🐼','🦁','🐮','🐷','🐸','🦋','🦄','🦅','🌟','🎭','🚀','🎸','🍕','☕','🌈','⚡']

export default function HostPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const [state, setState] = useState<GameState | null>(null)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [origin, setOrigin] = useState('')

  // Host as player
  const [hostPlayerId, setHostPlayerId] = useState<string | null>(null)
  const hostPlayerIdRef = useRef<string | null>(null)
  const [hostName, setHostName] = useState('')
  const [hostAvatar, setHostAvatar] = useState(AVATARS[0])
  const [joiningAsPlayer, setJoiningAsPlayer] = useState(false)
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
    const stored = sessionStorage.getItem(`host_player_${gameId}`)
    if (stored) {
      setHostPlayerId(stored)
      hostPlayerIdRef.current = stored
    }
  }, [gameId])

  const fetchState = useCallback(async () => {
    try {
      const pid = hostPlayerIdRef.current
      const url = pid
        ? `/api/games/${gameId}/state?player_id=${pid}`
        : `/api/games/${gameId}/state`
      const res = await fetch(url)
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

  async function handleJoinAsPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!hostName.trim()) return
    setJoiningAsPlayer(true)
    setJoinError('')
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, name: hostName.trim(), avatar: hostAvatar }),
      })
      const player: Player = await res.json()
      if (!player.id) throw new Error('Failed')
      sessionStorage.setItem(`host_player_${gameId}`, player.id)
      setHostPlayerId(player.id)
      hostPlayerIdRef.current = player.id
    } catch {
      setJoinError('Could not join. Try again.')
    } finally {
      setJoiningAsPlayer(false)
    }
  }

  async function handleStartRound() {
    setActionLoading(true)
    await fetch(`/api/games/${gameId}/start-round`, { method: 'POST' })
    setActionLoading(false)
    fetchState()
  }

  async function handleNextTurn() {
    setActionLoading(true)
    await fetch(`/api/games/${gameId}/advance`, { method: 'POST' })
    setActionLoading(false)
    fetchState()
  }

  async function handleReact(optionIndex: number) {
    if (!hostPlayerId || !state?.currentQuestion || state.myAnswer !== null) return
    await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id: gameId,
        question_id: state.currentQuestion.id,
        player_id: hostPlayerId,
        option_index: optionIndex,
      }),
    })
    fetchState()
  }

  if (error) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-red-400 text-xl">{error}</p>
    </div>
  )

  if (!state) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-white animate-pulse">Loading...</p>
    </div>
  )

  const { game, currentQuestion, currentAnswererId, players, answerCounts, myAnswer, turnNumber, totalTurns } = state
  const joinUrl = `${origin}/play/${game.id}`
  const totalReactions = answerCounts.reduce((s, a) => s + a.count, 0)
  const isMyTurn = hostPlayerId === currentAnswererId
  const currentAnswerer = players.find(p => p.id === currentAnswererId)

  // HOST JOIN SCREEN (if not yet joined as player)
  if (!hostPlayerId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">👑</div>
            <h1 className="text-2xl font-bold text-white">You're the Host!</h1>
            <p className="text-indigo-300 text-sm mt-1">Join as a player too — you'll get a turn to answer</p>
          </div>
          <form onSubmit={handleJoinAsPlayer} className="space-y-5">
            <div>
              <p className="text-indigo-300 text-sm mb-2 text-center">Choose your avatar</p>
              <div className="grid grid-cols-5 gap-2">
                {AVATARS.map(av => (
                  <button key={av} type="button" onClick={() => setHostAvatar(av)}
                    className={`text-3xl p-2 rounded-xl transition-all ${hostAvatar === av ? 'bg-indigo-500 ring-2 ring-white scale-110' : 'bg-white/10 hover:bg-white/20'}`}>
                    {av}
                  </button>
                ))}
              </div>
              <p className="text-center text-4xl mt-3">{hostAvatar}</p>
            </div>
            <div>
              <label className="block text-indigo-300 text-sm mb-1">Your name</label>
              <input type="text" value={hostName} onChange={e => setHostName(e.target.value)}
                placeholder="Enter your name..." maxLength={20} autoFocus
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-indigo-400 text-center text-lg" />
            </div>
            {joinError && <p className="text-red-400 text-sm text-center">{joinError}</p>}
            <button type="submit" disabled={joiningAsPlayer || !hostName.trim()}
              className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xl font-bold rounded-2xl transition-all">
              {joiningAsPlayer ? '⏳ Setting up...' : '👑 Enter as Host'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              👑 Host
              {game.round_number > 0 && <span className="text-gray-400 text-sm font-normal">Round {game.round_number}</span>}
            </h1>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-indigo-400">{game.code}</div>
            <div className="text-xs text-gray-400">{players.length} players</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">

            {/* WAITING */}
            {game.status === 'waiting' && (
              <div className="bg-gray-800 rounded-2xl p-8 text-center">
                <div className="text-5xl mb-4">👋</div>
                <h2 className="text-2xl font-bold mb-3">Share this link</h2>
                <div className="bg-gray-700 rounded-xl px-4 py-3 font-mono text-sm text-indigo-300 break-all mb-2">{joinUrl}</div>
                <div className="bg-gray-700 rounded-xl p-4 mb-6">
                  <p className="text-sm text-gray-400 mb-1">Or share the code</p>
                  <p className="text-4xl font-mono font-bold text-yellow-400 tracking-widest">{game.code}</p>
                </div>
                <button onClick={handleStartRound} disabled={players.length < 1 || actionLoading}
                  className="px-8 py-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xl font-bold rounded-2xl transition-all">
                  {players.length < 1 ? 'Waiting for players...' : `🚀 Start Round (${players.length} players)`}
                </button>
              </div>
            )}

            {/* ACTIVE TURN */}
            {game.status === 'active' && currentQuestion && (
              <div className="space-y-4">
                {/* Turn progress */}
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">Turn {turnNumber} of {totalTurns}</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${(turnNumber / totalTurns) * 100}%` }} />
                  </div>
                  <span className="text-gray-400 text-sm">{totalReactions} reacted</span>
                </div>

                {/* Who's answering */}
                <div className="bg-indigo-900/50 border border-indigo-500/30 rounded-2xl p-4 flex items-center gap-3">
                  <span className="text-4xl">{currentAnswerer?.avatar ?? '🎤'}</span>
                  <div>
                    <p className="text-indigo-300 text-xs">Answering now</p>
                    <p className="text-white font-bold text-lg">{currentAnswerer?.name ?? '...'}</p>
                  </div>
                  {isMyTurn && <span className="ml-auto text-yellow-400 text-sm font-bold">← That's you!</span>}
                </div>

                {/* Question */}
                <div className="bg-gray-800 rounded-2xl p-6">
                  <p className="text-white text-xl font-semibold text-center leading-relaxed">{currentQuestion.text}</p>
                </div>

                {/* Host reacts if not their turn */}
                {!isMyTurn && (
                  <div>
                    <p className="text-gray-400 text-xs text-center mb-2">
                      {myAnswer !== null ? `You reacted: ${REACTION_EMOJIS[myAnswer]}` : 'React while they answer:'}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {REACTION_EMOJIS.map((emoji, i) => {
                        const rc = REACTION_COLORS[i]
                        const isMyReaction = myAnswer === i
                        return (
                          <button key={i} onClick={() => handleReact(i)} disabled={myAnswer !== null}
                            className={`${isMyReaction ? `${rc.bg} ring-2 ring-white` : myAnswer !== null ? 'bg-gray-700 opacity-40' : `${rc.bg} hover:opacity-90`} rounded-xl py-3 text-2xl transition-all disabled:cursor-default`}>
                            {emoji}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {isMyTurn && (
                  <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-3 text-center">
                    <p className="text-yellow-300 font-bold">🎤 It's your turn! Answer out loud.</p>
                    <p className="text-yellow-400/70 text-xs mt-1">Others are reacting to your answer</p>
                  </div>
                )}

                {/* Reaction distribution */}
                <div className="bg-gray-800 rounded-2xl p-4">
                  <p className="text-gray-400 text-xs mb-3">Reactions ({totalReactions})</p>
                  <div className="grid grid-cols-4 gap-2">
                    {REACTION_EMOJIS.map((emoji, i) => {
                      const count = answerCounts.find(a => a.option_index === i)?.count ?? 0
                      const pct = totalReactions > 0 ? Math.round((count / totalReactions) * 100) : 0
                      const rc = REACTION_COLORS[i]
                      return (
                        <div key={i} className={`${rc.bg} rounded-xl p-3 text-center`}>
                          <div className="text-2xl mb-1">{emoji}</div>
                          <div className="text-white font-bold">{count}</div>
                          {pct > 0 && <div className="text-white/70 text-xs">{pct}%</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Next turn button */}
                <button onClick={handleNextTurn} disabled={actionLoading}
                  className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-lg font-bold rounded-2xl transition-all">
                  {actionLoading ? '...' : turnNumber >= totalTurns ? '🏁 End Round' : '➡️ Next Turn'}
                </button>
              </div>
            )}

            {/* ROUND COMPLETE */}
            {game.status === 'round_complete' && (
              <div className="bg-gray-800 rounded-2xl p-8 text-center">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold mb-2">Round {game.round_number} Complete!</h2>
                <p className="text-gray-400 mb-6">Everyone had their turn.</p>
                <button onClick={handleStartRound} disabled={actionLoading}
                  className="px-8 py-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xl font-bold rounded-2xl transition-all">
                  🔄 Start Round {game.round_number + 1}
                </button>
              </div>
            )}
          </div>

          {/* Players sidebar */}
          <div className="bg-gray-800 rounded-2xl p-4">
            <h3 className="font-bold text-gray-300 mb-3">👥 Players ({players.length})</h3>
            <div className="space-y-2">
              {players.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No players yet</p>}
              {players.map((player) => {
                const isAnswering = player.id === currentAnswererId && game.status === 'active'
                const isHost = player.id === hostPlayerId
                return (
                  <div key={player.id} className={`flex items-center gap-2 py-2 px-2 rounded-xl border-b border-gray-700 last:border-0 ${isAnswering ? 'bg-indigo-900/40 border border-indigo-500/30' : ''}`}>
                    <span className="text-xl">{player.avatar}</span>
                    <span className="flex-1 font-medium truncate text-sm">
                      {player.name}
                      {isHost && <span className="text-yellow-400 text-xs ml-1">👑</span>}
                    </span>
                    {isAnswering && <span className="text-xs text-indigo-400">🎤</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
