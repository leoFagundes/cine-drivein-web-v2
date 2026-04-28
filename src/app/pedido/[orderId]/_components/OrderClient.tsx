'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  collection, doc, onSnapshot, addDoc,
  orderBy, query, serverTimestamp,
} from 'firebase/firestore'
import type { Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { FaArrowLeft, FaCheck, FaPaperPlane, FaShoppingBag } from 'react-icons/fa'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  name: string
  quantity: number
  value: number
  photo?: string
  observation?: string
  additionals?: string[]
  additionals_sauce?: string[]
  additionals_drink?: string[]
  additionals_sweet?: string[]
}

type OrderStatus = 'active' | 'finished' | 'canceled'

interface Order {
  orderNumber: number
  status: OrderStatus
  spot: string
  username: string
  phone: string
  items: OrderItem[]
  subtotal: number
  serviceFee: number
  total: number
}

interface ChatMessage {
  id: string
  text: string
  sender: 'admin' | 'customer'
  senderName: string
  createdAt: Timestamp | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatTime(ts: Timestamp | null) {
  if (!ts) return ''
  return ts.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function renderText(raw: string): React.ReactNode[] {
  return raw.split(/(\*\*[^*]+\*\*|__[^_]+__|_[^_]+_|\n)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (/^__[^_]+__$/.test(part)) return <u key={i}>{part.slice(2, -2)}</u>
    if (/^_[^_]+_$/.test(part))   return <em key={i}>{part.slice(1, -1)}</em>
    if (part === '\n')              return <br key={i} />
    return <span key={i}>{part}</span>
  })
}

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  active:   { label: 'Em andamento', cls: 'bg-amber-400/10 text-amber-400 border-amber-400/30' },
  finished: { label: 'Finalizado',   cls: 'bg-green-500/10 text-green-400 border-green-500/30' },
  canceled: { label: 'Cancelado',    cls: 'bg-red-500/10  text-red-400  border-red-500/30'  },
}

const EXTRA_GROUPS = [
  { key: 'additionals'       as const, label: 'Acomp.'  },
  { key: 'additionals_sauce' as const, label: 'Molho'   },
  { key: 'additionals_drink' as const, label: 'Bebida'  },
  { key: 'additionals_sweet' as const, label: 'Doce'    },
]

function Placeholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-(--bg-elevated)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-(--text-muted) opacity-25">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3v7" />
      </svg>
    </div>
  )
}

function getCustomerName() {
  if (typeof window === 'undefined') return 'Cliente'
  return localStorage.getItem('@cinedrive:name') ?? 'Cliente'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrderClient({ orderId, isNew }: { orderId: string; isNew: boolean }) {
  const router = useRouter()
  const [order, setOrder]       = useState<Order | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const [showSuccess, setShowSuccess] = useState(isNew)
  const [summaryOpen, setSummaryOpen] = useState(true)
  const [unread, setUnread]     = useState(0)       // admin msgs while scrolled up
  const bottomRef    = useRef<HTMLDivElement>(null)
  const scrollRef    = useRef<HTMLDivElement>(null)  // the scrollable content div
  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const prevMsgCount = useRef(0)
  const customerName = getCustomerName()

  // Auto-hide success banner
  useEffect(() => {
    if (!isNew) return
    const t = setTimeout(() => setShowSuccess(false), 4000)
    return () => clearTimeout(t)
  }, [isNew])

  // Real-time order document — handles status, items, any field change
  useEffect(() => {
    return onSnapshot(
      doc(db, 'orders', orderId),
      (snap) => { if (snap.exists()) setOrder(snap.data() as Order) },
      (err)  => console.error('[order listener]', err),
    )
  }, [orderId])

  // Real-time messages — handles new, edited and deleted messages
  useEffect(() => {
    const q = query(
      collection(db, 'orders', orderId, 'messages'),
      orderBy('createdAt', 'asc'),
    )
    return onSnapshot(
      q,
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage)),
      (err)  => console.error('[messages listener]', err),
    )
  }, [orderId])

  // Smart scroll: go to bottom automatically; if scrolled up, show unread badge
  function isNearBottom() {
    const el = scrollRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  useEffect(() => {
    const newCount = messages.length
    if (newCount <= prevMsgCount.current) { prevMsgCount.current = newCount; return }
    const latestIsAdmin = messages[newCount - 1]?.sender === 'admin'
    if (isNearBottom() || !latestIsAdmin) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setUnread(0)
    } else {
      setUnread((n) => n + 1)
    }
    prevMsgCount.current = newCount
  }, [messages])

  // Auto-resize textarea
  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    const el = textareaRef.current
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 120)}px` }
  }

  async function sendMessage() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    try {
      await addDoc(collection(db, 'orders', orderId, 'messages'), {
        text: trimmed,
        sender: 'customer',
        senderName: customerName,
        createdAt: serverTimestamp(),
      })
    } catch {
      setText(trimmed)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-(--bg)">
        <div className="w-8 h-8 rounded-full border-2 border-(--border) border-t-(--primary) animate-spin" />
      </div>
    )
  }

  const statusCfg = STATUS[order.status] ?? STATUS.active

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-(--bg) sm:bg-[#06080d] sm:flex sm:justify-center min-h-dvh">
      <div className="w-full max-w-130 bg-(--bg) h-dvh flex flex-col sm:shadow-2xl">

        {/* Header */}
        <header className="flex items-center justify-between px-3 h-14 border-b border-(--border) shrink-0">
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-(--bg-elevated) border border-(--border) cursor-pointer text-(--text-secondary)"
          >
            <FaArrowLeft size={15} />
          </button>
          <div className="flex flex-col items-center leading-none gap-0.5">
            <span className="text-(--text-muted) text-[9px] tracking-[3px] uppercase font-semibold">
              Cine Drive-in
            </span>
            <span className="text-(--text-primary) font-bold text-base">
              Pedido #{order.orderNumber}
            </span>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusCfg.cls}`}>
            {statusCfg.label}
          </span>
        </header>

        {/* Scrollable body */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          onScroll={() => { if (isNearBottom()) { setUnread(0); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) } }}
        >

          {/* Success banner */}
          {showSuccess && (
            <div className="mx-4 mt-4 flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <FaCheck size={14} className="text-white" />
              </div>
              <div>
                <p className="text-green-400 font-bold text-sm m-0 leading-snug">
                  Pedido enviado com sucesso!
                </p>
                <p className="text-(--text-muted) text-xs m-0 mt-0.5 leading-snug">
                  Acompanhe o status e converse com a lanchonete abaixo.
                </p>
              </div>
            </div>
          )}

          {/* Order summary */}
          <div className="mx-4 mt-4 rounded-xl border border-(--border) bg-(--bg-surface) overflow-hidden">
            <button
              onClick={() => setSummaryOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3 cursor-pointer bg-transparent border-none text-left gap-2"
            >
              <div className="flex items-center gap-2">
                <FaShoppingBag size={13} className="text-(--text-muted)" />
                <span className="text-(--text-primary) font-semibold text-sm">Resumo do pedido</span>
                <span className="text-(--text-muted) text-xs">· Vaga {order.spot}</span>
              </div>
              <span className="text-(--text-muted) text-lg leading-none shrink-0">
                {summaryOpen ? '−' : '+'}
              </span>
            </button>

            {summaryOpen && (
              <div className="border-t border-(--border) px-4 pt-3 pb-4 flex flex-col gap-3">
                {order.items.map((item, idx) => {
                  const extras = EXTRA_GROUPS
                    .map((g) => ({ label: g.label, values: item[g.key] ?? [] }))
                    .filter((g) => g.values.length > 0)
                  return (
                    <div key={idx} className="flex gap-3">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-(--bg-elevated)">
                        {item.photo
                          ? <Image src={item.photo} alt={item.name} fill sizes="48px" className="object-cover" />
                          : <Placeholder />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-(--text-primary) font-semibold text-sm m-0 leading-snug">
                          {item.quantity}x {item.name}
                        </p>
                        {extras.map((g) => (
                          <p key={g.label} className="text-[11px] m-0 mt-0.5 leading-snug">
                            <span className="text-(--text-muted) font-medium">{g.label}: </span>
                            <span className="text-(--primary)">{g.values.join(', ')}</span>
                          </p>
                        ))}
                        {item.observation && (
                          <p className="text-[11px] m-0 mt-0.5 leading-snug">
                            <span className="text-(--text-muted) font-medium">Obs: </span>
                            <span className="text-(--text-muted) italic">{item.observation}</span>
                          </p>
                        )}
                        <p className="text-(--text-muted) text-xs m-0 mt-1">
                          {formatBRL(item.value * item.quantity)}
                        </p>
                      </div>
                    </div>
                  )
                })}

                <div className="border-t border-(--border) pt-2 mt-1 flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-(--text-muted)">Subtotal</span>
                    <span className="text-(--text-secondary)">{formatBRL(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-(--text-muted)">Taxa de serviço (10%)</span>
                    <span className="text-(--primary)">{formatBRL(order.serviceFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-(--text-primary)">Total</span>
                    <span className="text-(--text-primary)">{formatBRL(order.total)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat section */}
          <div className="px-4 pt-5 pb-3">
            {/* Divider */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-(--border)" />
              <span className="text-(--text-muted) text-[10px] uppercase tracking-widest font-semibold whitespace-nowrap">
                Chat com a lanchonete
              </span>
              <div className="flex-1 h-px bg-(--border)" />
            </div>

            {messages.length === 0 && (
              <p className="text-(--text-muted) text-xs text-center py-4 leading-relaxed">
                Nenhuma mensagem ainda.
                <br />Envie uma mensagem para a lanchonete!
              </p>
            )}

            {/* Messages */}
            <div className="flex flex-col gap-3">
              {messages.map((msg) => {
                const isMe = msg.sender === 'customer'
                return (
                  <div key={msg.id} className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && (
                      <span className="text-[10px] text-(--text-muted) ml-1">Lanchonete</span>
                    )}
                    <div
                      className={`max-w-[78%] px-4 py-2.5 text-sm leading-relaxed ${
                        isMe
                          ? 'bg-(--primary) text-white rounded-2xl rounded-br-sm'
                          : 'bg-(--bg-elevated) text-(--text-primary) rounded-2xl rounded-bl-sm border border-(--border)'
                      }`}
                    >
                      {renderText(msg.text)}
                    </div>
                    <span className="text-[10px] text-(--text-muted) mx-1">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          </div>

        </div>

        {/* Unread badge */}
        {unread > 0 && (
          <div className="shrink-0 flex justify-center pb-1 bg-(--bg)">
            <button
              onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setUnread(0) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-(--primary) text-white text-xs font-semibold cursor-pointer border-none"
            >
              {unread} nova{unread > 1 ? 's' : ''} mensagem{unread > 1 ? 's' : ''} ↓
            </button>
          </div>
        )}

        {/* Chat input — sticky bottom */}
        <div className="shrink-0 flex items-end gap-2.5 px-4 py-3 border-t border-(--border) bg-(--bg)">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Mensagem para a lanchonete…"
            className="flex-1 resize-none px-3.5 py-2.5 rounded-xl border border-(--border) bg-(--bg-elevated) text-(--text-primary) text-sm outline-none placeholder:text-(--text-muted) leading-snug overflow-hidden"
            style={{ minHeight: 42 }}
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className={`w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0 border-none transition-colors ${
              text.trim() && !sending
                ? 'bg-(--primary) text-white cursor-pointer'
                : 'bg-(--bg-elevated) text-(--text-muted) cursor-not-allowed'
            }`}
          >
            <FaPaperPlane size={14} />
          </button>
        </div>

      </div>
    </div>
  )
}
