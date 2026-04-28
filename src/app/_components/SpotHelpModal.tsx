"use client";

import Image from "next/image";

interface Props {
  onClose: () => void;
}

export default function SpotHelpModal({ onClose }: Props) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-(--bg-surface) rounded-2xl w-full max-w-sm border border-(--border) overflow-hidden"
      >
        {/* Image */}
        <div className="relative w-full aspect-4/3">
          <Image
            src="/images/ilustrative-spot-photo3.png"
            alt="Ilustração de como encontrar sua vaga"
            fill
            className="object-cover"
          />
          {/* Close button over image */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white text-lg border-none cursor-pointer leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 flex flex-col gap-4 bg-surface">
          <p className="text-(--text-secondary) text-sm leading-relaxed m-0">
            Para encontrar sua vaga, consulte os{" "}
            <span className="text-(--primary) font-semibold">dígitos</span> que
            se encontram na{" "}
            <span className="text-(--primary) font-semibold">
              lateral esquerda
            </span>
            . Como mostra na imagem acima.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-(--primary) text-white font-semibold text-sm border-none cursor-pointer"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
