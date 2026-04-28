import { Suspense } from 'react'
import OrderPage from './_components/OrderPage'

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-dvh bg-[#0f1117]">
      <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#0088c2] animate-spin" />
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <OrderPage />
    </Suspense>
  )
}
