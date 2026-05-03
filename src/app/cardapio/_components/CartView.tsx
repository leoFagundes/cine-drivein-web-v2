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
import { useToast } from "@/components/ui/Toast";

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

/**
 * Agrupa itens do carrinho por itemId, preservando a ordem de inserção.
 * Cada grupo representa um produto com N unidades independentes.
 */
function groupCart(cart: CartItem[]): { itemId: string; units: CartItem[] }[] {
  const order: string[] = [];
  const map = new Map<string, CartItem[]>();

  for (const item of cart) {
    if (!map.has(item.itemId)) {
      order.push(item.itemId);
      map.set(item.itemId, []);
    }
    map.get(item.itemId)!.push(item);
  }

  return order.map((id) => ({ itemId: id, units: map.get(id)! }));
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

  const { success } = useToast();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(localStorage.getItem("@cinedrive:name") ?? "");
    setPhone(localStorage.getItem("@cinedrive:phone") ?? "");
    setSpot(sessionStorage.getItem("@cinedrive:spot") ?? "");
  }, []);

  const subtotal = cart.reduce(
    (sum, i) => sum + (i.visibleValue ?? i.value) * i.quantity,
    0,
  );
  const serviceFee = Math.round(subtotal * 0.1 * 100) / 100;
  const total = subtotal + serviceFee;

  const groups = groupCart(cart);

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
        value: item.visibleValue ?? item.value,
        quantity: item.quantity,
        photo: item.photo ?? null,
        observation: item.observation ?? null,
        printTwice: item.printTwice ?? false,
        additionals: item.additionals ?? [],
        additionals_sauce: item.additionals_sauce ?? [],
        additionals_drink: item.additionals_drink ?? [],
        additionals_sweet: item.additionals_sweet ?? [],
      }));

      const locationData = (() => {
        try {
          return JSON.parse(
            localStorage.getItem("@cinedrive:userLocation") ?? "null",
          );
        } catch {
          return null;
        }
      })();
      const distanceMeters: number | null =
        locationData?.distanceMeters ?? null;

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
      const saved = JSON.parse(
        localStorage.getItem("@cinedrive:orders") ?? "[]",
      ) as { id: string; number: number }[];
      localStorage.setItem(
        "@cinedrive:orders",
        JSON.stringify([...saved, { id: orderRef.id, number: orderNumber }]),
      );
      router.push(`/pedido?id=${orderRef.id}&success=1`);
      success(
        "Pedido finalizado com sucesso.",
        "Vamos começar a preparar o seu pedido!",
      );
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

          {/* Cart groups */}
          {cart.length === 0 ? (
            <p className="text-(--text-muted) text-center mt-8 text-sm">
              Seu pedido está vazio.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {groups.map(({ itemId, units }) => {
                const first = units[0];
                const groupTotal = units.reduce(
                  (sum, u) => sum + u.value * u.quantity,
                  0,
                );
                const isMultiple = units.length > 1;

                return (
                  <div
                    key={itemId}
                    className="rounded-xl border border-(--border) bg-(--bg-surface) overflow-hidden"
                  >
                    {/* Group header: foto + nome + total do grupo */}
                    <div className="flex items-center gap-3 px-4 pt-3.5 pb-3 border-b border-(--border)">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-(--bg-elevated)">
                        {first.photo ? (
                          <Image
                            src={first.photo}
                            alt={first.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <Placeholder />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-(--text-primary) font-bold text-sm m-0 leading-snug">
                          {first.name}
                        </p>
                        <p className="text-(--text-muted) text-xs m-0 mt-0.5">
                          {isMultiple
                            ? `${units.length} unidades · ${formatBRL(groupTotal)}`
                            : formatBRL(groupTotal)}
                        </p>
                      </div>
                    </div>

                    {/* Individual units */}
                    {units.map((unit, unitIdx) => {
                      const extraGroups = [
                        { label: "Acomp.", values: unit.additionals ?? [] },
                        {
                          label: "Molho",
                          values: unit.additionals_sauce ?? [],
                        },
                        {
                          label: "Bebida",
                          values: unit.additionals_drink ?? [],
                        },
                        { label: "Doce", values: unit.additionals_sweet ?? [] },
                      ].filter((g) => g.values.length > 0);

                      return (
                        <div
                          key={unit.draftId}
                          className={`flex items-start gap-3 px-4 py-3 ${
                            unitIdx < units.length - 1
                              ? "border-b border-(--border)"
                              : ""
                          }`}
                        >
                          {/* Badge de número — só aparece quando há múltiplas unidades */}
                          {isMultiple && (
                            <span className="w-5 h-5 rounded-full bg-(--primary)/15 text-(--primary) text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                              {unitIdx + 1}
                            </span>
                          )}

                          <div className="flex-1 min-w-0">
                            {/* Adicionais */}
                            {extraGroups.length > 0 ? (
                              extraGroups.map((g) => (
                                <p
                                  key={g.label}
                                  className="text-[11px] m-0 leading-snug"
                                >
                                  <span className="text-(--text-muted) font-medium">
                                    {g.label}:{" "}
                                  </span>
                                  <span className="text-(--primary)">
                                    {g.values.join(", ")}
                                  </span>
                                </p>
                              ))
                            ) : (
                              <p className="text-[11px] text-(--text-muted) italic m-0">
                                Sem adicionais
                              </p>
                            )}

                            {/* Observação */}
                            {unit.observation && (
                              <p className="text-[11px] m-0 mt-0.5 leading-snug">
                                <span className="text-(--text-muted) font-medium">
                                  Obs:{" "}
                                </span>
                                <span className="text-(--text-muted) italic">
                                  {unit.observation}
                                </span>
                              </p>
                            )}
                          </div>

                          {/* Preço unitário + lixeira */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-(--text-primary) font-semibold text-sm">
                              {formatBRL(unit.value)}
                            </span>
                            <button
                              onClick={() => onRemoveItem(unit.draftId)}
                              className="bg-transparent border-none cursor-pointer text-(--text-muted) hover:text-(--error) transition-colors p-0.5"
                            >
                              <FaTrash size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
