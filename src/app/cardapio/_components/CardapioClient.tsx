"use client";

import { useState, useEffect, useRef } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { StockItem, CartItem, Subitem } from "@/types";
import { useRouter } from "next/navigation";
import MenuView from "./MenuView";
import ItemView from "./ItemView";
import CartView from "./CartView";

type View = "menu" | "item" | "cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("@cinedrive:cart");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export default function CardapioClient() {
  const router = useRouter();
  const [items, setItems] = useState<StockItem[]>([]);
  const [subitems, setSubitems] = useState<Subitem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Tudo");
  const [view, setView] = useState<View>("menu");
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [cart, setCart] = useState<CartItem[]>(loadCart);
  const [loading, setLoading] = useState(true);
  const pushedHistory = useRef(false);

  // Intercept browser back button while inside item/cart view
  useEffect(() => {
    if (view !== "menu" && !pushedHistory.current) {
      window.history.pushState(null, "");
      pushedHistory.current = true;
    }
    if (view === "menu") pushedHistory.current = false;
  }, [view]);

  useEffect(() => {
    function handlePop() {
      setView("menu");
      setSelectedItem(null);
      pushedHistory.current = false;
    }
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // Redirect to home if store closes while browsing
  useEffect(() => {
    return onSnapshot(doc(db, "storeConfig", "main"), (snap) => {
      if (snap.exists() && snap.data().isOpen === false) router.push("/");
    });
  }, [router]);

  useEffect(() => {
    getDoc(doc(db, "stockConfig", "categoryOrder")).then((snap) => {
      if (snap.exists()) setCategories(snap.data().categories ?? []);
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "subitems"), (snap) => {
      setSubitems(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Subitem[]);
    });
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "items"), (snap) => {
      const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as StockItem[];
      setItems(loaded);
      setLoading(false);

      // Preload all visible item photos in the background
      loaded
        .filter((i) => i.isVisible && i.photo)
        .forEach((i) => {
          const img = new window.Image();
          img.src = i.photo!;
        });
    });
    return unsub;
  }, []);

  function persistCart(next: CartItem[]) {
    setCart(next);
    localStorage.setItem("@cinedrive:cart", JSON.stringify(next));
  }

  function addToCart(item: CartItem) {
    persistCart([...cart, item]);
  }

  function removeFromCart(draftId: string) {
    persistCart(cart.filter((i) => i.draftId !== draftId));
  }

  function updateCartQuantity(draftId: string, delta: number) {
    persistCart(
      cart
        .map((i) =>
          i.draftId === draftId ? { ...i, quantity: i.quantity + delta } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }

  function clearCart() {
    setCart([]);
    localStorage.removeItem("@cinedrive:cart");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-(--bg)">
        <div className="w-8 h-8 rounded-full border-2 border-(--border) border-t-(--primary) animate-spin" />
      </div>
    );
  }

  if (view === "cart") {
    return (
      <CartView
        cart={cart}
        onBack={() => setView("menu")}
        onRemoveItem={removeFromCart}
        onUpdateQuantity={updateCartQuantity}
        onClearCart={clearCart}
      />
    );
  }

  if (view === "item" && selectedItem) {
    return (
      <ItemView
        item={selectedItem}
        subitems={subitems}
        onBack={() => setView("menu")}
        onAdd={(item) => {
          addToCart(item);
          setView("menu");
        }}
      />
    );
  }

  return (
    <MenuView
      items={items}
      categories={categories}
      selectedCategory={selectedCategory}
      cart={cart}
      onSelectCategory={setSelectedCategory}
      onSelectItem={(item) => {
        setSelectedItem(item);
        setView("item");
      }}
      onOpenCart={() => setView("cart")}
      onBack={() => router.push("/")}
    />
  );
}
