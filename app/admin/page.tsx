'use client'
import { useState, useEffect } from 'react'
import { Question } from '@/lib/types'

const EMPTY_FORM = { text: '', options: ['', '', '', ''], correct_index: 0 }

export default function AdminPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
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
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  function startEdit(q: Question) {
    setForm({ text: q.text, options: [...q.options], correct_index: q.correct_index })
    setEditingId(q.id)
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.text.trim() || form.options.some(o => !o.trim())) return
    setSaving(true)
    try {
      if (editingId) {
        await fetch(`/api/questions/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
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
            <div>
              <label className="block text-gray-400 text-sm mb-1">Question</label>
              <input
                type="text"
                value={form.text}
                onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                placeholder="Enter your question..."
                className="w-full px-4 py-3 bg-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
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
                    className="w-full px-3 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indido-500 text-sm"
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
                    <p className="font-medium mb-2">{q.text}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {q.options.map((opt, i) => (
                        <p key={i} className={`text-sm ${i === q.correct_index ? 'text-green-400 font-medium' : 'text-gray-400'}`}>
                          {LABELS[i]}: {opt} {i === q.correct_index ? '✓' : ''}
                        </p>
                      ))}
                    </div>
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
