import { redirect } from 'next/navigation'

// Milestone 1 has no athlete-facing screens yet — the Today screen lands
// in M2. Until then, the root route just goes to the debug dump.
export default function RootPage() {
  redirect('/debug')
}
