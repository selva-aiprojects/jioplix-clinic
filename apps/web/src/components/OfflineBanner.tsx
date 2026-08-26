import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (online) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-center gap-2 px-4 py-2.5 bg-warning-500 text-white text-sm font-medium shadow-lg">
      <WifiOff className="h-4 w-4" />
      You're offline — some features may be unavailable.
    </div>
  )
}
