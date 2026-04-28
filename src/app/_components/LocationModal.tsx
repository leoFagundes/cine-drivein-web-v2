"use client";

import { FaWhatsapp } from "react-icons/fa";

const WHATSAPP_URL = "https://wa.me/556185119092";

interface Props {
  onAllow: () => void;
  loading: boolean;
}

export default function LocationModal({ onAllow, loading }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center sm:items-center justify-center z-[60] p-4 sm:p-6">
      <div className="bg-surface rounded-2xl w-full max-w-sm border border-(--border) flex flex-col overflow-hidden">
        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 pt-6 pb-5 flex flex-col gap-4 max-h-[75dvh]">
          <h2 className="text-primary text-xl font-bold text-center m-0 leading-snug">
            Precisamos da sua localização
          </h2>

          <p className="text-(--text-secondary) text-sm leading-relaxed m-0">
            Para garantir que você está dentro da área de cobertura e evitar
            pedidos inválidos, solicitamos sua localização.
          </p>

          <p className="text-(--text-secondary) text-sm leading-relaxed m-0">
            Realizar pedidos online com o objetivo deliberado de prejudicar um
            estabelecimento, gerando prejuízo financeiro sem a intenção real de
            consumir o produto ou serviço, pode ser enquadrado como crime
            previsto na legislação brasileira, como estelionato ou dano, além de
            configurar ato ilícito passível de responsabilização civil.
          </p>

          <p className="text-(--text-muted) text-xs leading-relaxed m-0">
            (Art. 171 e 163 do Código Penal, Art. 186 e 927 do Código Civil, Lei
            12.965/2014 - Marco Civil da Internet)
          </p>
        </div>

        {/* Actions — outside scroll area, always visible */}
        <div className="px-6 pb-6 pt-2 flex flex-col gap-3 border-t border-(--border)">
          {loading ? (
            <div className="flex items-center justify-center py-4 bg-(--bg)">
              <div className="w-4 h-4 rounded-full border-2 border-(--border) border-t-(--primary) animate-spin" />
            </div>
          ) : (
            <button
              onClick={onAllow}
              className="w-full py-4 rounded-xl bg-(--primary) text-white font-bold text-base border-none cursor-pointer"
            >
              Permitir localização
            </button>
          )}

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 text-sm text-(--primary) no-underline"
          >
            <FaWhatsapp size={14} /> Precisa de ajuda?
          </a>
        </div>
      </div>
    </div>
  );
}
