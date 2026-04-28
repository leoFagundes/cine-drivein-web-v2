"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { FaArrowLeft, FaTrash, FaWhatsapp } from "react-icons/fa";
import { BsInfoCircleFill } from "react-icons/bs";
import {
  doc,
  collection,
  addDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CartItem } from "@/types";
import { useRouter } from "next/navigation";

const WHATSAPP_URL = "https://wa.me/556185119092";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Placeholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-(--bg-elevated)">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5 text-(--text-muted) opacity-25"
      >
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3v7" />
      </svg>
    </div>
  );
}

interface Props {
  cart: CartItem[];
  onBack: () => void;
  onRemoveItem: (draftId: string) => void;
  onUpdateQuantity: (draftId: string, delta: number) => void;
  onClearCart: () => void;
}

export default function CartView({
  cart,
  onBack,
  onRemoveItem,
  onUpdateQuantity,
  onClearCart,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [spot, setSpot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(localStorage.getItem("@cinedrive:name") ?? "");
    setPhone(localStorage.getItem("@cinedrive:phone") ?? "");
    setSpot(sessionStorage.getItem("@cinedrive:spot") ?? "");
  }, []);

  const subtotal = cart.reduce((sum, i) => sum + i.value * i.quantity, 0);
  const serviceFee = Math.round(subtotal * 0.1 * 100) / 100;
  const total = subtotal + serviceFee;

  async function handleFinalize() {
    if (cart.length === 0 || loading) return;
    setLoading(true);
    setError("");
    try {
      const counterRef = doc(db, "counters", "orders");
      const orderNumber = await runTransaction(db, async (tx) => {
        const snap = await tx.get(counterRef);
        const next = (snap.exists() ? (snap.data().last as number) : 0) + 1;
        tx.set(counterRef, { last: next }, { merge: true });
        return next;
      });

      const itemsPayload = cart.map((item) => ({
        itemId: item.itemId,
        codItem: item.codItem,
        name: item.name,
        value: item.value,
        quantity: item.quantity,
        photo: item.photo ?? null,
        observation: item.observation ?? null,
        additionals: item.additionals ?? [],
        additionals_sauce: item.additionals_sauce ?? [],
        additionals_drink: item.additionals_drink ?? [],
        additionals_sweet: item.additionals_sweet ?? [],
      }));

      const locationData = (() => {
        try { return JSON.parse(localStorage.getItem("@cinedrive:userLocation") ?? "null"); } catch { return null; }
      })();
      const distanceMeters: number | null = locationData?.distanceMeters ?? null;

      const orderRef = await addDoc(collection(db, "orders"), {
        orderNumber,
        username: name,
        phone,
        spot: parseInt(spot) || spot,
        status: "active",
        items: itemsPayload,
        subtotal,
        serviceFee,
        serviceFeePaid: false,
        discount: 0,
        total,
        distanceMeters,
        createdAt: serverTimestamp(),
      });

      onClearCart();
      const saved = JSON.parse(localStorage.getItem("@cinedrive:orders") ?? "[]") as { id: string; number: number }[];
      localStorage.setItem("@cinedrive:orders", JSON.stringify([...saved, { id: orderRef.id, number: orderNumber }]));
      router.push(`/pedido?id=${orderRef.id}&success=1`);
    } catch (err) {
      console.error(err);
      setError("Erro ao finalizar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-(--bg) sm:bg-[#181c25] sm:flex sm:justify-center">
      <div className="w-full max-w-130 bg-(--bg) min-h-dvh flex flex-col sm:shadow-2xl">
        {/* Header */}
        <header className="flex items-center px-3 h-14 border-b border-(--border) shrink-0">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-(--bg-elevated) border border-(--border) cursor-pointer text-(--text-secondary)"
          >
            <FaArrowLeft size={15} />
          </button>
          <span className="text-(--text-primary) font-bold text-lg ml-3">
            Meu Pedido
          </span>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-10 flex flex-col gap-4">
          {/* User info */}
          <div className="p-4 rounded-xl border border-(--border) bg-(--bg-surface) flex flex-col gap-1.5">
            <p className="text-(--text-primary) font-bold text-base m-0">
              Vaga {spot}
            </p>
            <p className="text-(--text-secondary) text-sm m-0">
              <strong className="text-(--text-primary) font-semibold">
                Nome:
              </strong>{" "}
              {name}
            </p>
            <p className="text-(--text-secondary) text-sm m-0">
              <strong className="text-(--text-primary) font-semibold">
                Telefone:
              </strong>{" "}
              {phone}
            </p>
          </div>

          {/* Cart items */}
          {cart.length === 0 ? (
            <p className="text-(--text-muted) text-center mt-8 text-sm">
              Seu pedido está vazio.
            </p>
          ) : (
            <div className="rounded-xl border border-(--border) bg-(--bg-surface) overflow-hidden">
              {cart.map((item, idx) => {
                const extraGroups = [
                  { label: "Acomp.", values: item.additionals ?? [] },
                  { label: "Molho", values: item.additionals_sauce ?? [] },
                  { label: "Bebida", values: item.additionals_drink ?? [] },
                  { label: "Doce", values: item.additionals_sweet ?? [] },
                ].filter((g) => g.values.length > 0);
                return (
                  <div
                    key={item.draftId}
                    className={`flex gap-3 px-4 py-3.5 ${idx < cart.length - 1 ? "border-b border-(--border)" : ""}`}
                  >
                    {/* Photo */}
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-(--bg-elevated)">
                      {item.photo ? (
                        <Image
                          src={item.photo}
                          alt={item.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <Placeholder />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-(--text-primary) font-semibold text-sm m-0 leading-snug">
                          {item.name}
                        </p>
                        <button
                          onClick={() => onRemoveItem(item.draftId)}
                          className="bg-transparent border-none cursor-pointer text-(--text-muted) hover:text-(--error) transition-colors p-0.5 shrink-0"
                        >
                          <FaTrash size={13} />
                        </button>
                      </div>

                      {extraGroups.map((g) => (
                        <p key={g.label} className="text-[11px] m-0 mt-0.5 leading-snug">
                          <span className="text-(--text-muted) font-medium">{g.label}: </span>
                          <span className="text-(--primary)">{g.values.join(", ")}</span>
                        </p>
                      ))}
                      {item.observation && (
                        <p className="text-[11px] m-0 mt-0.5 leading-snug">
                          <span className="text-(--text-muted) font-medium">Obs: </span>
                          <span className="text-(--text-muted) italic">{item.observation}</span>
                        </p>
                      )}

                      {/* Quantity controls + price */}
                      <div className="flex items-center gap-2 mt-2.5">
                        <button
                          onClick={() => onUpdateQuantity(item.draftId, -1)}
                          className="w-7 h-7 rounded-full border border-(--border) bg-(--bg-elevated) text-(--text-primary) text-base cursor-pointer flex items-center justify-center shrink-0 select-none leading-none"
                        >
                          −
                        </button>
                        <span className="text-(--text-primary) font-bold text-sm w-5 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.draftId, 1)}
                          className="w-7 h-7 rounded-full border border-(--border) bg-(--bg-elevated) text-(--text-primary) text-base cursor-pointer flex items-center justify-center shrink-0 select-none leading-none"
                        >
                          +
                        </button>
                        <span className="text-(--text-primary) font-bold text-sm ml-auto">
                          {formatBRL(item.value * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Totals */}
          <div className="p-4 rounded-xl border border-(--border) bg-(--bg-surface) flex flex-col gap-2.5">
            <div className="flex justify-between">
              <span className="text-(--text-secondary) text-sm">Subtotal</span>
              <span className="text-(--text-primary) font-semibold text-sm">
                {formatBRL(subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-(--text-secondary) text-sm">
                Taxa de serviço (10%)
              </span>
              <span className="text-(--primary) font-semibold text-sm">
                {formatBRL(serviceFee)}
              </span>
            </div>
            <div className="flex justify-between pt-2.5 border-t border-(--border)">
              <span className="text-(--text-primary) font-bold text-base">
                Total
              </span>
              <span className="text-(--text-primary) font-black text-base">
                {formatBRL(total)}
              </span>
            </div>
            <p className="text-(--text-muted) text-xs m-0 mt-0.5 flex items-start gap-1.5 leading-snug">
              <BsInfoCircleFill
                size={11}
                className="shrink-0 mt-0.5 text-(--primary)"
              />
              Pagamento efetuado{" "}
              <strong className="text-(--text-secondary)">apenas</strong> na
              entrega do pedido.
            </p>
          </div>

          {error && (
            <p className="text-(--error) text-sm text-center m-0">{error}</p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={onBack}
              className="flex-1 py-3.5 rounded-xl bg-(--bg-elevated) border border-(--border) text-(--text-secondary) font-semibold text-sm cursor-pointer leading-snug"
            >
              Voltar ao cardápio
            </button>
            <button
              onClick={handleFinalize}
              disabled={loading || cart.length === 0}
              className={`flex-1 py-3.5 rounded-xl text-white font-semibold text-sm border-none leading-snug ${
                loading || cart.length === 0
                  ? "bg-(--text-muted) cursor-not-allowed"
                  : "bg-(--primary) cursor-pointer"
              }`}
            >
              {loading ? "Enviando..." : "Finalizar pedido"}
            </button>
          </div>

          {/* WhatsApp */}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 text-sm text-(--primary) no-underline"
          >
            <FaWhatsapp size={16} /> Precisa de ajuda?
          </a>
        </div>
      </div>
    </div>
  );
}
