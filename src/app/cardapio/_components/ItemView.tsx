'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FaArrowLeft, FaCheck } from 'react-icons/fa'
import type { StockItem, CartItem, Subitem, AdditionalGroup } from '@/types'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function getPrice(item: StockItem) {
  return item.visibleValue ?? item.value
}

const GROUPS: { key: AdditionalGroup; label: string }[] = [
  { key: 'additionals', label: 'Acompanhamentos' },
  { key: 'additionals_sauce', label: 'Molho' },
  { key: 'additionals_drink', label: 'Bebida' },
  { key: 'additionals_sweet', label: 'Sobremesa' },
]

function Placeholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-(--bg-elevated)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 text-(--text-muted) opacity-15">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3v7" />
      </svg>
    </div>
  )
}

interface Props {
  item: StockItem
  subitems: Subitem[]
  onBack: () => void
  onAdd: (item: CartItem) => void
}

export default function ItemView({ item, subitems, onBack, onAdd }: Props) {
  const [observation, setObservation] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [selections, setSelections] = useState<Record<AdditionalGroup, string | null>>({
    additionals: null,
    additionals_sauce: null,
    additionals_drink: null,
    additionals_sweet: null,
  })
  const [formError, setFormError] = useState('')

  const price = getPrice(item)

  function select(group: AdditionalGroup, id: string) {
    setFormError('')
    setSelections((prev) => ({ ...prev, [group]: prev[group] === id ? null : id }))
  }

  function getSelectedName(group: AdditionalGroup): string[] {
    const id = selections[group]
    if (!id) return []
    const sub = subitems.find((s) => s.id === id)
    return sub ? [sub.name] : []
  }

  function handleAdd() {
    for (const { key, label } of GROUPS) {
      const groupIds = item[key]
      if (groupIds.length === 0) continue
      const available = subitems.filter((s) => groupIds.includes(s.id) && s.isVisible)
      if (available.length > 0 && !selections[key]) {
        setFormError(`Escolha uma opção para "${label}".`)
        return
      }
    }

    onAdd({
      draftId: `${item.id}-${Date.now()}`,
      itemId: item.id,
      codItem: item.codItem,
      name: item.name,
      value: price,
      quantity,
      photo: item.photo,
      observation: observation.trim() || undefined,
      additionals: getSelectedName('additionals').length ? getSelectedName('additionals') : undefined,
      additionals_sauce: getSelectedName('additionals_sauce').length ? getSelectedName('additionals_sauce') : undefined,
      additionals_drink: getSelectedName('additionals_drink').length ? getSelectedName('additionals_drink') : undefined,
      additionals_sweet: getSelectedName('additionals_sweet').length ? getSelectedName('additionals_sweet') : undefined,
    })
  }

  return (
    <div className="min-h-dvh bg-(--bg) sm:bg-[#06080d] sm:flex sm:justify-center">
      <div className="relative w-full max-w-130 bg-(--bg) min-h-dvh flex flex-col sm:shadow-2xl">

        {/* ── Image ───────────────────────────────────────────── */}
        <div className="relative shrink-0 h-72 sm:h-80 bg-(--bg-elevated)">
          {item.photo
            ? <Image src={item.photo} alt={item.name} fill sizes="520px" priority className="object-cover" />
            : <Placeholder />
          }

          {/* bottom gradient so content card blends in */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-(--bg) to-transparent" />

          {/* floating back button */}
          <button
            onClick={onBack}
            className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/10 cursor-pointer"
          >
            <FaArrowLeft size={15} />
          </button>
        </div>

        {/* ── Content card (overlaps image) ───────────────────── */}
        <div className="-mt-10 rounded-t-3xl bg-(--bg) relative z-10 flex-1 flex flex-col">

          {/* drag-handle pill */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-(--border)" />
          </div>

          {/* scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4 flex flex-col gap-5">

            {/* name + unit price */}
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-(--text-primary) text-2xl font-black leading-tight flex-1 m-0">
                {item.name}
              </h1>
              <div className="shrink-0 text-right">
                <p className="text-(--text-muted) text-[10px] uppercase tracking-widest font-semibold m-0">
                  por unidade
                </p>
                <p className="text-(--primary) text-xl font-black m-0 leading-tight">
                  {formatBRL(price)}
                </p>
              </div>
            </div>

            {/* description */}
            {item.description && (
              <p className="text-(--text-secondary) text-sm leading-relaxed m-0">
                {item.description}
              </p>
            )}

            <div className="h-px bg-(--border)" />

            {/* ── Additionals ───────────────────────────────── */}
            {GROUPS.map(({ key, label }) => {
              const groupIds = item[key]
              if (groupIds.length === 0) return null
              const available = subitems.filter((s) => groupIds.includes(s.id) && s.isVisible)
              if (available.length === 0) return null
              const selected = selections[key]

              return (
                <div key={key} className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-(--text-primary) text-sm font-bold">{label}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-(--error)/10 text-(--error)">
                      Obrigatório
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {available.map((sub) => {
                      const isSelected = selected === sub.id
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => select(key, sub.id)}
                          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm border transition-all duration-150 cursor-pointer text-left font-medium ${
                            isSelected
                              ? 'bg-(--primary)/12 border-(--primary) text-(--primary)'
                              : 'bg-(--bg-elevated) border-(--border) text-(--text-secondary) hover:border-(--text-muted)'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'border-(--primary) bg-(--primary)' : 'border-(--border)'
                          }`}>
                            {isSelected && <FaCheck size={8} className="text-white" />}
                          </span>
                          <span className="leading-snug">{sub.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* ── Observation ───────────────────────────────── */}
            <div className="flex flex-col gap-2">
              <span className="text-(--text-primary) text-sm font-bold">Observação</span>
              <input
                type="text"
                placeholder="Ex: sem cebola, bem passado..."
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-(--border) bg-(--bg-elevated) text-(--text-primary) text-sm outline-none placeholder:text-(--text-muted)"
              />
            </div>

            {/* ── Quantity + Total ──────────────────────────── */}
            <div className="flex items-center justify-between gap-4 px-4 py-4 rounded-2xl bg-(--bg-elevated) border border-(--border)">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-full border border-(--border) bg-(--bg) text-(--text-primary) text-xl cursor-pointer flex items-center justify-center select-none font-light"
                >
                  −
                </button>
                <span className="text-(--text-primary) font-black text-xl w-6 text-center tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  className="w-9 h-9 rounded-full border border-(--border) bg-(--bg) text-(--text-primary) text-xl cursor-pointer flex items-center justify-center select-none font-light"
                >
                  +
                </button>
              </div>
              <div className="text-right">
                <p className="text-(--text-muted) text-[10px] uppercase tracking-widest font-semibold m-0">Total</p>
                <p className="text-(--primary) font-black text-2xl m-0 leading-tight tabular-nums">
                  {formatBRL(price * quantity)}
                </p>
              </div>
            </div>

            {/* error */}
            {formError && (
              <p className="text-(--error) text-sm text-center m-0">{formError}</p>
            )}

          </div>

          {/* ── Bottom action bar ─────────────────────────────── */}
          <div className="shrink-0 flex gap-2.5 px-5 py-4 border-t border-(--border) bg-(--bg)">
            <button
              onClick={onBack}
              className="px-5 py-3.5 rounded-xl bg-(--bg-elevated) border border-(--border) text-(--text-secondary) font-semibold text-sm cursor-pointer whitespace-nowrap"
            >
              Voltar
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 py-3.5 rounded-xl bg-(--primary) text-white font-bold text-sm cursor-pointer"
            >
              Adicionar ao pedido
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
