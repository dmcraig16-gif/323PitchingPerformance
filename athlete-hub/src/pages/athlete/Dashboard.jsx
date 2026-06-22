function Card({ title, children }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <h2 className="font-semibold mb-2">{title}</h2>
      {children}
    </div>
  )
}

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Today</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="Today's Workout">
          <p className="text-sm text-slate-500">No workout assigned yet.</p>
        </Card>
        <Card title="Journal Prompt">
          <p className="text-sm text-slate-500">No prompt yet — check back after your coach sets one up.</p>
        </Card>
        <Card title="Devotional">
          <p className="text-sm text-slate-500">No devotional posted today.</p>
        </Card>
        <Card title="Habits">
          <p className="text-sm text-slate-500">No habits assigned yet.</p>
        </Card>
      </div>
    </div>
  )
}
