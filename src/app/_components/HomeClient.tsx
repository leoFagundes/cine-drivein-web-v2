'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { StoreStatus } from '@/types'
import SpotHelpModal from './SpotHelpModal'
import { FaWhatsapp } from 'react-icons/fa'
import { BsInfoCircleFill } from 'react-icons/bs'

const WHATSAPP_URL = 'https://wa.me/556185119092'

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function Logo() {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-(--primary) text-[22px] font-bold italic leading-none tracking-tight">
        cine
      </span>
      <div className="border-2 border-(--primary) rounded px-4.5 py-1 leading-none">
        <span className="text-(--text-primary) text-[26px] font-black tracking-[4px]">
          DRIVE-IN
        </span>
      </div>
      <span className="text-(--text-muted) text-[9px] tracking-[2px] uppercase font-semibold mt-0.5">
        CINEMA FORA DE SÉRIE
      </span>
    </div>
  )
}

const inputCls =
  'w-full px-4 py-3.5 rounded-lg border border-(--border) bg-(--bg-surface) text-(--text-primary) text-[15px] outline-none'

export default function HomeClient() {
  const router = useRouter()
  const [config, setConfig] = useState<StoreStatus | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [spot, setSpot] = useState('')
  const [error, setError] = useState('')
  const [spotModalOpen, setSpotModalOpen] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'storeConfig', 'main'), (snap) => {
      setConfig(snap.exists() ? (snap.data() as StoreStatus) : ({} as StoreStatus))
    })
    return unsub
  }, [])

  useEffect(() => {
    setName(localStorage.getItem('@cinedrive:name') ?? '')
    setPhone(localStorage.getItem('@cinedrive:phone') ?? '')
  }, [])

  useEffect(() => { localStorage.setItem('@cinedrive:name', name.trim()) }, [name])
  useEffect(() => { localStorage.setItem('@cinedrive:phone', phone) }, [phone])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '')
    if (!name.trim()) { setError('Informe seu nome.'); return }
    if (digits.length < 10) { setError('Telefone inválido.'); return }
    if (!/^\d{3,4}$/.test(spot)) { setError('A vaga deve ter 3 ou 4 dígitos.'); return }
    sessionStorage.setItem('@cinedrive:spot', spot)
    router.push('/cardapio')
  }

  if (config === null) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-(--bg)">
        <div className="w-8 h-8 rounded-full border-2 border-(--border) border-t-(--primary) animate-spin" />
      </div>
    )
  }

  if (!config.isOpen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-5 px-6 text-center bg-(--bg)">
        <Logo />
        <div className="flex flex-col gap-1.5">
          <h2 className="text-(--text-primary) text-xl font-bold m-0">Estamos Fechados</h2>
          <p className="text-(--text-secondary) text-sm m-0">
            Horário de Funcionamento da Lanchonete:
          </p>
          {config.openingTime && config.closingTime && (
            <p className="text-(--text-primary) text-[15px] m-0">
              de <strong>{config.openingTime}</strong> até <strong>{config.closingTime}</strong>
            </p>
          )}
        </div>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm text-(--primary) no-underline"
        >
          <FaWhatsapp size={16} /> Precisa de Ajuda?
        </a>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-dvh gap-6 px-6 py-10 bg-(--bg)">
        <Logo />
        <p className="text-(--text-primary) text-base text-center m-0">
          Para fazer seu pedido, preencha<br />os campos abaixo
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xs">
          <input
            type="text"
            placeholder="Nome ou apelido"
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            className={inputCls}
          />
          <input
            type="tel"
            inputMode="numeric"
            placeholder="(XX) XXXXX-XXXX"
            value={phone}
            onChange={(e) => { setPhone(formatPhone(e.target.value)); setError('') }}
            className={inputCls}
          />
          <div className="flex flex-col gap-1.5">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Vaga"
              value={spot}
              onChange={(e) => { setSpot(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setSpotModalOpen(true)}
              className="flex items-center gap-1 text-xs text-(--primary) underline bg-transparent border-none cursor-pointer p-0 w-fit"
            >
              <BsInfoCircleFill size={12} />
              Como encontrar minha vaga?
            </button>
          </div>
          {error && <p className="text-(--error) text-sm m-0">{error}</p>}
          <button
            type="submit"
            className="w-full py-3.5 mt-1 rounded-lg bg-(--primary) text-white font-semibold text-[15px] border-none cursor-pointer"
          >
            Ir para o cardápio
          </button>
        </form>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm text-(--primary) no-underline"
        >
          <FaWhatsapp size={16} /> Precisa de Ajuda?
        </a>
      </div>
      {spotModalOpen && <SpotHelpModal onClose={() => setSpotModalOpen(false)} />}
    </>
  )
}
