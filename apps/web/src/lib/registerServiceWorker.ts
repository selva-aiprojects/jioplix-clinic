const SW_PATH = '/sw.js'

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/',
    })

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          newWorker.postMessage({ type: 'SKIP_WAITING' })
          window.dispatchEvent(new CustomEvent('sw-update'))
        }
      })
    })
  } catch (err) {
    console.error('[SW] Registration failed:', err)
  }
}
