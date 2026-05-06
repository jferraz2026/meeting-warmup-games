export function generateGameCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export const ANSWER_COLORS = [
  { bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-white', label: '▲', name: 'Red' },
  { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-white', label: '◆', name: 'Blue' },
  { bg: 'bg-yellow-400', hover: 'hover:bg-yellow-500', text: 'text-black', label: '●', name: 'Yellow' },
  { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-white', label: '■', name: 'Green' },
]
