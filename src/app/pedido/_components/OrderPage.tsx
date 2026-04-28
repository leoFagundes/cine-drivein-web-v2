'use client'

import { useSearchParams } from 'next/navigation'
import OrderClient from '../[orderId]/_components/OrderClient'

export default function OrderPage() {
  const params = useSearchParams()
  const orderId = params.get('id') ?? ''
  const isNew   = params.get('success') === '1'

  if (!orderId) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#0f1117]">
        <p className="text-white/50 text-sm">Pedido não encontrado.</p>
      </div>
    )
  }

  return <OrderClient orderId={orderId} isNew={isNew} />
}
