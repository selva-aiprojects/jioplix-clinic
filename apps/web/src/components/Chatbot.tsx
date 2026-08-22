import { useEffect, useRef, useState } from 'react'
import { Bot, ChevronRight, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { useAuth } from '../auth/useAuth'

type Message = { from: 'assistant' | 'user'; text: string }

const quickQuestions = [
  'How do I book an appointment?',
  'Where are prescriptions?',
  'How does Pharmacy work?',
  'How do I manage users?',
]

function answerFor(input: string): string {
  const question = input.toLowerCase()
  if (question.includes('appointment') || question.includes('book')) return 'Open Appointments, choose New Appointment, then select the patient, doctor, date, and time. From a patient profile, Book Appointment preselects the patient for you.'
  if (question.includes('prescription') || question.includes('medicine')) return 'Open a consultation from an appointment, create a prescription, add medicines, then issue it. Issued prescriptions appear in Pharmacy, and the prescription panel has a Print action.'
  if (question.includes('pharmacy')) return 'Pharmacy shows issued prescriptions waiting to be dispensed. Review the medication and stock details, then use Dispense to complete the queue item.'
  if (question.includes('lab') || question.includes('laboratory')) return 'Laboratory tracks orders from collection through results. Use New Lab Order to choose the patient, ordering doctor, and tests, then record and review results.'
  if (question.includes('user') || question.includes('staff') || question.includes('team')) return 'User Management is in the sidebar. Search the team, filter by role, and invite staff with the access role that matches their hospital responsibilities.'
  if (question.includes('patient')) return 'Open Patients to search the registry or register a new patient. Select a patient to view their timeline, billing, and appointment actions.'
  return 'I can help with appointments, patients, prescriptions, Pharmacy, Laboratory, or User Management. Choose a question below or ask me in your own words.'
}

export default function Chatbot() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { from: 'assistant', text: `Hi${user?.fullName ? `, ${user.fullName.split(/\s+/)[0]}` : ''}. I can help you find workflows and features in Jioplix.` },
  ])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])
  useEffect(() => {
    const openAssistant = () => setOpen(true)
    window.addEventListener('jioplix:open-assistant', openAssistant)
    return () => window.removeEventListener('jioplix:open-assistant', openAssistant)
  }, [])

  function ask(question: string) {
    const trimmed = question.trim()
    if (!trimmed) return
    setMessages(prev => [...prev, { from: 'user', text: trimmed }, { from: 'assistant', text: answerFor(trimmed) }])
    setInput('')
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-surface-900/10 md:hidden" onClick={() => setOpen(false)} />}
      {open && <section className="fixed bottom-24 right-4 z-50 flex h-[min(620px,calc(100vh-7rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-[0_24px_70px_rgba(16,35,74,.2)]" aria-label="Jioplix assistant" role="dialog"><header className="flex items-center gap-3 bg-surface-900 px-4 py-4 text-white"><div className="rounded-xl bg-accent-400/20 p-2"><Bot className="h-5 w-5 text-accent-300" /></div><div className="flex-1"><p className="text-[13px] font-bold">Jioplix Assistant</p><p className="mt-0.5 text-[11px] text-white/60">Workflow guidance for your care team</p></div><button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close assistant"><X className="h-4 w-4" /></button></header><div className="flex-1 space-y-3 overflow-y-auto bg-surface-50 p-4">{messages.map((message, index) => <div key={`${message.from}-${index}`} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-5 ${message.from === 'user' ? 'rounded-br-md bg-primary-600 text-white' : 'rounded-bl-md border border-surface-200 bg-white text-surface-700 shadow-sm'}`}>{message.text}</div></div>)}<div ref={endRef} /></div><div className="border-t border-surface-100 bg-white p-3"><p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-surface-400"><Sparkles className="h-3 w-3 text-primary-500" /> Quick questions</p><div className="mb-3 flex flex-wrap gap-1.5">{quickQuestions.map(question => <button key={question} onClick={() => ask(question)} className="inline-flex items-center gap-1 rounded-lg border border-surface-200 px-2 py-1.5 text-left text-[10px] font-medium text-surface-600 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700">{question}<ChevronRight className="h-3 w-3" /></button>)}</div><form className="flex items-center gap-2" onSubmit={event => { event.preventDefault(); ask(input) }}><input value={input} onChange={event => setInput(event.target.value)} placeholder="Ask about a workflow..." className="min-w-0 flex-1 rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 text-[12px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20" /><button type="submit" className="rounded-xl bg-primary-600 p-2.5 text-white hover:bg-primary-700" aria-label="Send message"><Send className="h-4 w-4" /></button></form><p className="mt-2 text-[10px] text-surface-400">Guidance only. Confirm clinical decisions with a qualified professional.</p></div></section>}
      <button onClick={() => setOpen(value => !value)} className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-[12px] font-bold text-white shadow-[0_12px_30px_rgba(15,84,198,.28)] transition-transform hover:-translate-y-0.5 hover:bg-primary-700" aria-label={open ? 'Close assistant' : 'Open assistant'}><MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Ask Jioplix</span></button>
    </>
  )
}
