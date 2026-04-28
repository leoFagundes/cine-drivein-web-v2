'use client'

import Image from 'next/image'

interface Props {
  onClose: () => void
}

export default function SpotHelpModal({ onClose }: Props) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-(--bg-surface) rounded-xl p-5 w-full max-w-sm flex flex-col gap-4 border border-(--border)"
      >
        <div className="flex items-center justify-between">
          <span className="text-(--text-primary) font-semibold text-[15px]">
            Como encontrar sua vaga
          </span>
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-(--text-muted) text-[22px] leading-none px-1 py-0"
          >
            ×
          </button>
        </div>
        <div className="relative w-full aspect-4/3 rounded-md overflow-hidden">
          <Image
            src="/images/ilustrative-spot-photo3.png"
            alt="Ilustração de como encontrar sua vaga"
            fill
            className="object-contain"
          />
        </div>
      </div>
    </div>
  )
}
