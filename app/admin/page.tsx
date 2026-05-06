'use client'
import { useState, useEffect } from 'react'
import { Question } from '@/lib/types'

const REACTION_EMOJIS = ['😄', '😅', '🤔', '😂']

type FormState = { text: string; options: string[]; correct_index: number | null; question_type: 'trivia' | 'reaction' }

const EMPTY_TRIVIA_FORM: FormState = { text: '', options: ['', '', '', ''], correct_index: 0, question_type: 'trivia' }
const EMPTY_REACTION_FORM: FormState = { text: '', options: [...REACTION_EMOJIS], correct_index: null, question_type: 'reaction' }

export default function AdminPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_TRIVIA_FORM)
  const [saving, setSaving] = useState(false)

  async function loadQuestions() {
    try {
      const res = await fetch('/api/questions')
      const data = await res.json()
      setQuestions(Array.isArray(data) ? data : [])
    } catch {
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadQuestions() }, [])

  function startAdd() {
    setForm(EMPTY_TRIVIA_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  function startEdit(q: Question) {
    if (q.question_type === 'reaction') {
      setForm({ text: q.text, options: [...q.options], correct_index: null, question_type: 'reaction' })
    } else {
      setForm({ text: q.text, options: [...q.options], correct_index: q.correct_index ?? 0, question_type: 'trivia' })
    }
    setEditingId(q.id)
    setShowForm(true)
  }

  function switchType(type: 'trivia' | 'reaction') {
    if (type === 'reaction') {
      setForm(f => ({ text: f.text, options: [...REACTION_EMOJIS], correct_index: null, question_type: 'reaction' }))
    } else {
      setForm(f => ({ text: f.text, options: ['', '', '', ''], correct_index: 0, question_type: 'trivia' }))
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.text.trim()) return
    if (form.question_type === 'trivia' && form.options.some(o => !o.trim())) return
    setSaving(true)
    try {
      const payload = {
        text: form.text,
        options: form.question_type === 'reaction' ? REACTION_EMOJIS : form.options,
        correct_index: form.question_type === 'reaction' ? null : form.correct_index,
        question_type: form.question_type,
      }
      if (editingId) {
        await fetch(`/api/questions/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setShowForm(false)
      loadQuestions()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this question?')) return
    await fetch(`/api/questions/${id}`, { method: 'DELETE' })
    loadQuestions()
  }

  const LABELS = ['A', 'B', 'C', 'D']
  const COLORS = ['text-red-400', 'text-blue-400', 'text-yellow-400', 'text-green-400']

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">⚙️ Question Bank</h1>
            <p className="text-gray-400 text-sm mt-1">{questions.length} questions</p>
          </div>
          <div className="flex gap-3">
            <a href="/" className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm">← Home</a>
            <button
              onClick={startAdd}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-medium transition-all"
            >
              + Add Question
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSave} className="bg-gray-800 rounded-2xl p-6 mb-6 space-y-4">
            <h2 className="font-bold text-lg">{editingId ? 'Edit Question' : 'New Question'}</h2>

            {/* Type toggle */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => switchType('reaction')}
                  className={`flex-1 py-2 px-4 rounded-xl font-medium text-sm transition-all ${
                    form.question_type === 'reaction'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Icebreaker 💬
                </button>
                <button
                  type="button"
                  onClick={() => switchType('trivia')}
                  className={`flex-1 py-2 px-4 rounded-xl font-medium text-sm transition-all ${
                    form.question_type === 'trivia'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Trivia 🧠
                </button>
              </div>
              {form.question_type === 'reaction' && (
                <p className="text-gray-500 text-xs mt-2">Players tap one of 4 emoji buttons. No correct answer — just see the distribution.</p>
              )}
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Question</label>
              <input
                type="text"
                value={form.text}
                onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                placeholder={form.question_type === 'reaction' ? 'Enter your icebreaker question...' : 'Enter your trivia question...'}
                className="w-full px-4 py-3 bg-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Reaction: show emoji preview, hide option inputs */}
            {form.question_type === 'reaction' && (
              <div>
                <label className="block text-gray-400 text-sm mb-2">Reaction buttons (fixed)</label>
                <div className="flex gap-3">
                  {REACTION_EMOJIS.map((emoji, i) => (
                    <div key={i} className="flex-1 bg-gray-700 rounded-xl py-3 flex items-center justify-center text-3xl">
                      {emoji}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trivia: show option inputs and correct answer selector */}
            {form.question_type === 'trivia' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {form.options.map((opt, i) => (
                    <div key={i}>
                      <label className={`block text-sm mb-1 font-medium ${COLORS[i]}`}>Option {LABELS[i]}</label>
                      <input
                        type="text"
                        value={opt}
                        onChange={e => setForm(f => {
                          const options = [...f.options]
                          options[i] = e.target.value
                          return { ...f, options }
                        })}
                        placeholder={`Option ${LABELS[i]}`}
                        className="w-full px-3 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        required
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Correct Answer</label>
                  <div className="flex gap-3">
                    {LABELS.map((label, i) => (
                      <label key={i} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="correct"
                          checked={form.correct_index === i}
                          onChange={() => setForm(f => ({ ...f, correct_index: i }))}
                          className="accent-indigo-500"
                        />
                        <span className={`font-bold ${COLORS[i]}`}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-xl font-medium transition-all"
              >
                {saving ? 'Saving...' : '✅ Save'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-400 text-center py-12 animate-pulse">Loading questions...</p>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">📝</p>
            <p>No questions yet. Add your first one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div key={q.id} className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-gray-500 text-sm mt-1 w-6">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        q.question_type === 'reaction'
                          ? 'bg-indigo-900 text-indigo-300'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {q.question_type === 'reaction' ? '💬 Icebreaker' : '🧠 Trivia'}
                      </span>
                    </div>
                    <p className="font-medium mb-2">{q.text}</p>
                    {q.question_type === 'reaction' ? (
                      <div className="flex gap-2">
                        {q.options.map((opt, i) => (
                          <span key={i} className="text-xl">{opt}</span>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1">
                        {q.options.map((opt, i) => (
                          <p key={i} className={`text-sm ${i === q.correct_index ? 'text-green-400 font-medium' : 'text-gray-400'}`}>
                            {LABELS[i]}: {opt} {i === q.correct_index ? '✓' : ''}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(q)}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="px-3 py-1 bg-red-900/50 hover:bg-red-800 rounded-lg text-sm text-red-400 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
