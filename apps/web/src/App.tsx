import { Routes, Route } from 'react-router-dom'

function DashboardPage() {
  return <div className="p-8 text-2xl font-medium">Dashboard — coming soon</div>
}

function EditorPage() {
  return <div className="p-8 text-2xl font-medium">Editor — coming soon</div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/workflow/:id" element={<EditorPage />} />
    </Routes>
  )
}
