import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import Chatbot from './Chatbot'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex w-full min-h-screen">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onToggle={() => setCollapsed(!collapsed)} onMobileClose={() => setMobileOpen(false)} />
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? 'ml-[72px]' : 'ml-[260px]'} max-md:ml-0`}>
        <TopBar onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 p-6 max-md:p-4 overflow-auto">
          <Outlet />
        </main>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <Chatbot />
    </div>
  )
}
