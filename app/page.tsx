'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'home' | 'join'>('home')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleHost() {
    setLoading(true)
    try {
      const res = await fetch('/api/games', { method: 'POST' })
      const game = await res.json()
      if (game.error) throw new Error(game.error)
      router.push(`/host/${game.id}`)
    } catch (err) {
      setError('Failed to create game. Make sure the database is connected.')
      setLoading(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/games/code/${code.trim().toUpperCase()}`)
      const game = await res.json()
      if (game.error) throw new Error('Game not found. Check the code.')
      router.push(`/play/${game.id}?name=${encodeURIComponent(name.trim())}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-4xl font-bold text-white mb-2">Meeting Warmup</h1>
          <p className="text-indigo-300">Fun quiz games to kick off your meetings</p>
        </div>

        {mode === 'home' && (
          <div className="space-y-4">
            <button
              onClick={handleHost}
              disabled={loading}
              className="w-full py-5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xl font-bold rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/25 hover:scale-105"
            >
              {loading ? '⏳ Creating...' : '🚀 Host a Game'}
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-5 bg-white/10 hover:bg-white/20 text-white text-xl font-bold rounded-2xl transition-all border border-white/20"
            >
              🙋 Join a Game
            </button>
            <a
              href="/admin"
              className="block text-center text-indigo-400 hover:text-indigo-300 text-sm mt-4 transition-colors"
            >
              ⚙️ Manage Questions
            </a>
          </div>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-indigo-300 text-sm mb-1">Game Code</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
                maxLength={6}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-center text-2xl font-mono tracking-widest placeholder-white/30 focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-indigo-300 text-sm mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-indigo-400"
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || !code.trim() || !name.trim()}
              className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xl font-bold rounded-2xl transition-all"
            >
              {loading ? '⏳ Joining...' : '✅ Join Game'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('home'); setError('') }}
              className="w-full py-3 text-indigo-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
