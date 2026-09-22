const CATEGORIES = ['Sleep', 'Light exposure', 'Nutrition', 'Movement', 'Wind-down']

export default function Habits() {
  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 mb-6">Habits</h1>
      <p className="text-sm text-neutral-500 mb-6">
        A daily rhythm to align your sleep, light exposure, and nutrition with your body's
        natural cycle. Your coach will customize these targets for you.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="bg-white rounded-2xl shadow-card p-5">
            <h2 className="font-semibold mb-2">{cat}</h2>
            <p className="text-sm text-neutral-500">No habit assigned yet.</p>
          </div>
        ))}
      </div>
    </div>
  )
}
