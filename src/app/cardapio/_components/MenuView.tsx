"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { FaArrowLeft, FaShoppingCart } from "react-icons/fa";
import type { StockItem, CartItem } from "@/types";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getPrice(item: StockItem) {
  return item.visibleValue ?? item.value;
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
        className="w-7 h-7 text-(--text-muted) opacity-25"
      >
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3v7" />
      </svg>
    </div>
  );
}

interface Props {
  items: StockItem[];
  categories: string[];
  selectedCategory: string;
  cart: CartItem[];
  onSelectCategory: (cat: string) => void;
  onSelectItem: (item: StockItem) => void;
  onOpenCart: () => void;
  onBack: () => void;
  savedScrollY?: React.RefObject<number>;
}

function ItemCard({ item, onClick }: { item: StockItem; onClick: () => void }) {
  const price = getPrice(item);

  if (item.isFeatured) {
    return (
      <button
        onClick={onClick}
        className="relative flex gap-3.5 w-full p-3.5 text-left transition-all duration-150 active:scale-[0.98] cursor-pointer rounded-xl"
        style={{
          background: "var(--bg-card, var(--bg-surface))",
          border: "1.5px solid #BA7517",
        }}
      >
        {/* Tab descendo do topo */}
        <span
          className="absolute -top-px right-3 text-[10px] font-bold uppercase tracking-wide leading-none"
          style={{
            background: "#BA7517",
            color: "#fff7e6",
            padding: "3px 10px 4px",
            borderRadius: "0 0 6px 6px",
          }}
        >
          ⭐ Destaque
        </span>

        <div className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-(--bg-elevated)">
          {item.photo ? (
            <Image
              src={item.photo}
              alt={item.name}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <Placeholder />
          )}
        </div>

        <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
          <div>
            <p className="text-(--text-primary) font-semibold text-[15px] m-0 leading-snug line-clamp-1">
              {item.name}
            </p>
            {item.description && (
              <p className="text-(--text-muted) text-xs leading-snug m-0 mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
          <p className="text-(--primary) font-bold text-[15px] m-0 mt-2">
            {formatBRL(price)}
          </p>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex gap-3.5 w-full p-3.5 bg-(--bg-card) border border-(--border) rounded-xl cursor-pointer text-left transition-all duration-150 active:scale-[0.98] active:bg-(--bg-elevated) hover:border-(--border-focus)"
    >
      <div className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-(--bg-elevated)">
        {item.photo ? (
          <Image
            src={item.photo}
            alt={item.name}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <Placeholder />
        )}
      </div>
      <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
        <div>
          <p className="text-(--text-primary) font-semibold text-[15px] m-0 leading-snug line-clamp-1">
            {item.name}
          </p>
          {item.description && (
            <p className="text-(--text-muted) text-xs leading-snug m-0 mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
        <p className="text-(--primary) font-bold text-[15px] m-0 mt-2">
          {formatBRL(price)}
        </p>
      </div>
    </button>
  );
}

function sortItems(items: StockItem[]): StockItem[] {
  return [...items].sort(
    (a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0),
  );
}

export default function MenuView({
  items,
  categories,
  selectedCategory,
  cart,
  onSelectCategory,
  onSelectItem,
  onOpenCart,
  onBack,
  savedScrollY,
}: Props) {
  useEffect(() => {
    if (savedScrollY?.current) {
      window.scrollTo({ top: savedScrollY.current, behavior: "instant" });
    }
  }, []);

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const visible = items.filter((i) => i.isVisible);

  const knownCats = new Set(categories);
  const orderedCats = [
    ...categories.filter((c) => visible.some((i) => i.category === c)),
    ...visible
      .map((i) => i.category)
      .filter((c) => !knownCats.has(c))
      .filter((c, idx, arr) => arr.indexOf(c) === idx),
  ];

  const sections =
    selectedCategory === "Tudo"
      ? orderedCats
          .map((cat) => ({
            title: cat,
            items: sortItems(visible.filter((i) => i.category === cat)),
          }))
          .filter((s) => s.items.length > 0)
      : [
          {
            title: null,
            items: sortItems(
              visible.filter((i) => i.category === selectedCategory),
            ),
          },
        ];

  return (
    <div className="min-h-dvh bg-(--bg) sm:bg-[#181c25] sm:flex sm:justify-center">
      <div className="w-full max-w-130 bg-(--bg) min-h-dvh flex flex-col sm:shadow-2xl">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-3 h-16 bg-(--bg)/95 backdrop-blur-md border-b border-(--border)">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-(--bg-elevated) border border-(--border) cursor-pointer text-(--text-secondary) hover:text-(--text-primary) transition-colors"
          >
            <FaArrowLeft size={15} />
          </button>

          <div className="flex flex-col items-center leading-none gap-0.5">
            <span className="text-(--text-muted) text-[9px] tracking-[3px] uppercase font-semibold">
              Cine Drive-in
            </span>
            <span className="text-(--text-primary) font-bold text-lg">
              Cardápio
            </span>
          </div>

          <button
            onClick={onOpenCart}
            className="relative cursor-pointer bg-transparent border-none p-2"
          >
            <FaShoppingCart size={22} className="text-(--text-secondary)" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 leading-none">
                {cartCount}
              </span>
            )}
          </button>
        </header>

        {/* Category tabs */}
        <div className="sticky top-16 z-19 bg-(--bg) border-b border-(--border) overflow-x-auto [scrollbar-width:none]">
          <div className="flex px-4 w-max">
            {["Tudo", ...orderedCats].map((cat) => (
              <button
                key={cat}
                onClick={(e) => {
                  onSelectCategory(cat);
                  e.currentTarget.scrollIntoView({
                    inline: "center",
                    behavior: "smooth",
                    block: "nearest",
                  });
                }}
                className={`bg-transparent border-none border-b-2 text-sm px-3.5 py-3 cursor-pointer whitespace-nowrap transition-colors duration-150 ${
                  selectedCategory === cat
                    ? "text-(--primary) border-b-(--primary) font-semibold"
                    : "text-(--text-secondary) border-b-transparent font-normal"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Item list */}
        <div className="px-4 py-5 pb-12 flex flex-col gap-7 flex-1">
          {sections.length === 0 && (
            <p className="text-(--text-muted) text-center mt-10">
              Nenhum item disponível.
            </p>
          )}
          {sections.map((section) => (
            <div key={section.title ?? "__items"}>
              {section.title && (
                <h2 className="text-(--text-primary) text-lg font-bold m-0 mb-3 pb-2 border-b border-(--border)">
                  {section.title}
                </h2>
              )}
              <div className="flex flex-col gap-2.5">
                {section.items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onClick={() => onSelectItem(item)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
