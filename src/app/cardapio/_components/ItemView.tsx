"use client";

import { useState } from "react";
import Image from "next/image";
import { FaArrowLeft, FaCheck } from "react-icons/fa";
import type { StockItem, CartItem, Subitem, AdditionalGroup } from "@/types";
import { useToast } from "@/components/ui/Toast";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getPrice(item: StockItem) {
  return item.visibleValue ?? item.value;
}

const GROUPS: { key: AdditionalGroup; label: string }[] = [
  { key: "additionals", label: "Acompanhamentos" },
  { key: "additionals_sauce", label: "Molho" },
  { key: "additionals_drink", label: "Bebida" },
  { key: "additionals_sweet", label: "Sobremesa" },
];

type UnitConfig = {
  selections: Record<AdditionalGroup, string | null>;
  observation: string;
};

function makeEmptyUnit(): UnitConfig {
  return {
    selections: {
      additionals: null,
      additionals_sauce: null,
      additionals_drink: null,
      additionals_sweet: null,
    },
    observation: "",
  };
}

function Placeholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-(--bg-elevated)">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-16 h-16 text-(--text-muted) opacity-15"
      >
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3v7" />
      </svg>
    </div>
  );
}

interface Props {
  item: StockItem;
  subitems: Subitem[];
  onBack: () => void;
  onAdd: (items: CartItem[]) => void; // ← agora recebe array
}

export default function ItemView({ item, subitems, onBack, onAdd }: Props) {
  const [units, setUnits] = useState<UnitConfig[]>([makeEmptyUnit()]);
  const [formError, setFormError] = useState("");
  const { error: toastError, info } = useToast();

  const price = getPrice(item);
  const quantity = units.length;
  const total = price * quantity;

  function updateUnit(index: number, patch: Partial<UnitConfig>) {
    setFormError("");
    setUnits((prev) =>
      prev.map((u, i) => (i === index ? { ...u, ...patch } : u)),
    );
  }

  function selectAdditional(
    unitIndex: number,
    group: AdditionalGroup,
    id: string,
  ) {
    setFormError("");
    setUnits((prev) =>
      prev.map((u, i) =>
        i === unitIndex
          ? {
              ...u,
              selections: {
                ...u.selections,
                [group]: u.selections[group] === id ? null : id,
              },
            }
          : u,
      ),
    );
  }

  function addUnit() {
    if (quantity >= 10) return;
    setUnits((prev) => [...prev, makeEmptyUnit()]);
  }

  function removeUnit() {
    if (quantity <= 1) return;
    setUnits((prev) => prev.slice(0, -1));
  }

  function getSelectedName(unit: UnitConfig, group: AdditionalGroup): string[] {
    const id = unit.selections[group];
    if (!id) return [];
    const sub = subitems.find((s) => s.id === id);
    return sub ? [sub.name] : [];
  }

  function handleAdd() {
    // Validate every unit
    for (let i = 0; i < units.length; i++) {
      for (const { key, label } of GROUPS) {
        const groupIds = item[key];
        if (groupIds.length === 0) continue;
        const available = subitems.filter(
          (s) => groupIds.includes(s.id) && s.isVisible,
        );
        if (available.length > 0 && !units[i].selections[key]) {
          const unitLabel = quantity > 1 ? ` no item ${i + 1}` : "";
          toastError(`Escolha um ${label}${unitLabel}!`);
          setFormError(`Escolha uma opção para "${label}"${unitLabel}.`);
          // Scroll to the offending unit
          document
            .getElementById(`unit-${i}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      }
    }

    const cartItems: CartItem[] = units.map((unit, i) => ({
      draftId: `${item.id}-${Date.now()}-${i}`,
      itemId: item.id,
      codItem: item.codItem,
      name: item.name,
      value: price,
      quantity: 1,
      photo: item.photo,
      observation: unit.observation.trim() || undefined,
      additionals: getSelectedName(unit, "additionals").length
        ? getSelectedName(unit, "additionals")
        : undefined,
      additionals_sauce: getSelectedName(unit, "additionals_sauce").length
        ? getSelectedName(unit, "additionals_sauce")
        : undefined,
      additionals_drink: getSelectedName(unit, "additionals_drink").length
        ? getSelectedName(unit, "additionals_drink")
        : undefined,
      additionals_sweet: getSelectedName(unit, "additionals_sweet").length
        ? getSelectedName(unit, "additionals_sweet")
        : undefined,
    }));

    onAdd(cartItems);
    info(
      `${quantity}x ${item.name} adicionado${quantity > 1 ? "s" : ""} ao carrinho!`,
    );
  }

  const hasAnyGroup = GROUPS.some(({ key }) => {
    const groupIds = item[key];
    if (groupIds.length === 0) return false;
    return subitems.some((s) => groupIds.includes(s.id) && s.isVisible);
  });

  return (
    <div className="min-h-dvh bg-(--bg) sm:bg-[#181c25] sm:flex sm:justify-center">
      <div className="relative w-full max-w-130 bg-(--bg) min-h-dvh flex flex-col sm:shadow-2xl">
        {/* ── Image ───────────────────────────────────────────── */}
        <div className="relative shrink-0 h-72 sm:h-80 bg-(--bg-elevated)">
          {item.photo ? (
            <Image
              src={item.photo}
              alt={item.name}
              fill
              sizes="520px"
              priority
              className="object-cover"
            />
          ) : (
            <Placeholder />
          )}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-(--bg) to-transparent" />
          <button
            onClick={onBack}
            className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/10 cursor-pointer"
          >
            <FaArrowLeft size={15} />
          </button>
        </div>

        {/* ── Content card ────────────────────────────────────── */}
        <div className="-mt-10 rounded-t-3xl bg-(--bg) relative z-10 flex-1 flex flex-col">
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-(--border)" />
          </div>

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

            {item.description && (
              <p className="text-(--text-secondary) text-sm leading-relaxed m-0">
                {item.description}
              </p>
            )}

            <div className="h-px bg-(--border)" />

            {/* ── Quantity controls ─────────────────────────────── */}
            <div className="flex items-center justify-between gap-4 px-4 py-4 rounded-2xl bg-(--bg-elevated) border border-(--border)">
              <div className="flex items-center gap-3">
                <button
                  onClick={removeUnit}
                  className="w-9 h-9 rounded-full border border-(--border) bg-(--bg) text-(--text-primary) text-xl cursor-pointer flex items-center justify-center select-none font-light"
                >
                  −
                </button>
                <span className="text-(--text-primary) font-black text-xl w-6 text-center tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={addUnit}
                  className="w-9 h-9 rounded-full border border-(--border) bg-(--bg) text-(--text-primary) text-xl cursor-pointer flex items-center justify-center select-none font-light"
                >
                  +
                </button>
              </div>
              <div className="text-right">
                <p className="text-(--text-muted) text-[10px] uppercase tracking-widest font-semibold m-0">
                  Total
                </p>
                <p className="text-(--primary) font-black text-2xl m-0 leading-tight tabular-nums">
                  {formatBRL(total)}
                </p>
              </div>
            </div>

            {/* ── Per-unit blocks ───────────────────────────────── */}
            {units.map((unit, unitIndex) => (
              <div
                key={unitIndex}
                id={`unit-${unitIndex}`}
                className="flex flex-col gap-4 rounded-2xl border border-(--border) bg-(--bg-elevated) px-4 py-4"
              >
                {/* Unit header — only shown when quantity > 1 */}
                {quantity > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-(--primary) text-white text-xs font-black flex items-center justify-center shrink-0">
                      {unitIndex + 1}
                    </span>
                    <span className="text-(--text-primary) text-sm font-bold">
                      Item {unitIndex + 1}
                    </span>
                  </div>
                )}

                {/* Additionals groups */}
                {hasAnyGroup &&
                  GROUPS.map(({ key, label }) => {
                    const groupIds = item[key];
                    if (groupIds.length === 0) return null;
                    const available = subitems.filter(
                      (s) => groupIds.includes(s.id) && s.isVisible,
                    );
                    if (available.length === 0) return null;
                    const selected = unit.selections[key];

                    return (
                      <div key={key} className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-(--text-primary) text-sm font-bold">
                            {label}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-(--error)/10 text-(--error)">
                            Obrigatório
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {available.map((sub) => {
                            const isSelected = selected === sub.id;
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() =>
                                  selectAdditional(unitIndex, key, sub.id)
                                }
                                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm border transition-all duration-150 cursor-pointer text-left font-medium ${
                                  isSelected
                                    ? "bg-(--primary)/12 border-(--primary) text-(--primary)"
                                    : "bg-(--bg) border-(--border) text-(--text-secondary) hover:border-(--text-muted)"
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? "border-(--primary) bg-(--primary)"
                                      : "border-(--border)"
                                  }`}
                                >
                                  {isSelected && (
                                    <FaCheck size={8} className="text-white" />
                                  )}
                                </span>
                                <span className="leading-snug">{sub.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                {/* Observation */}
                <div className="flex flex-col gap-2">
                  <span className="text-(--text-primary) text-sm font-bold">
                    Observação{quantity > 1 ? ` — Item ${unitIndex + 1}` : ""}
                  </span>
                  <input
                    type="text"
                    placeholder="Ex: sem cebola, bem passado..."
                    value={unit.observation}
                    onChange={(e) =>
                      updateUnit(unitIndex, { observation: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-(--border) bg-(--bg) text-(--text-primary) text-sm outline-none placeholder:text-(--text-muted)"
                  />
                </div>
              </div>
            ))}

            {formError && (
              <p className="text-(--error) text-sm text-center m-0">
                {formError}
              </p>
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
  );
}
