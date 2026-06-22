import { useState } from 'react'

export default function Journal() {
  const [entry, setEntry] = useState('')

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Journal</h1>
      <div className="bg-white rounded-lg shadow-sm p-5 max-w-2xl">
        <p className="text-sm font-medium mb-2">Today's prompt</p>
        <p className="text-sm text-slate-500 mb-4">
          No prompt scheduled yet — write freely below.
        </p>
        <textarea
          className="w-full border rounded-md px-3 py-2 text-sm"
          rows={6}
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder="Write today's entry..."
        />
        <button className="mt-3 bg-slate-900 text-white rounded-md px-4 py-2 text-sm font-medium">
          Save entry
        </button>
      </div>
    </div>
  )
}
