import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingWizard from '../components/OnboardingWizard'

export default function Onboarding() {
  const navigate = useNavigate()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem('jioplix.onboarding.completed')
    if (completed === 'true') {
      navigate('/dashboard', { replace: true })
      return
    }
    setShow(true)
  }, [navigate])

  if (!show) return null

  return <OnboardingWizard />
}
