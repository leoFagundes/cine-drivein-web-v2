"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  documentId,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { StoreStatus } from "@/types";
import SpotHelpModal from "./SpotHelpModal";
import LocationModal from "./LocationModal";
import { FaWhatsapp, FaChevronRight, FaReceipt } from "react-icons/fa";
import { BsInfoCircleFill } from "react-icons/bs";

const WHATSAPP_URL = "https://wa.me/556185119092";

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function Logo() {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-(--primary) text-[22px] font-bold italic leading-none tracking-tight">
        cine
      </span>
      <div className="border-2 border-(--primary) rounded px-4.5 py-1 leading-none">
        <span className="text-(--text-primary) text-[26px] font-black tracking-[4px]">
          DRIVE-IN
        </span>
      </div>
      <span className="text-(--text-muted) text-[9px] tracking-[2px] uppercase font-semibold mt-0.5">
        CINEMA FORA DE SÉRIE
      </span>
    </div>
  );
}

const inputCls =
  "w-full px-4 py-3.5 rounded-lg border border-(--border) bg-(--bg-surface) text-(--text-primary) text-[15px] outline-none";

function fromStorage(key: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(key) ?? "";
}

function getDistanceInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TARGET_LAT = -15.778017634025696;
const TARGET_LNG = -47.89792262166641;

/** Saves location data and navigates to /cardapio */
function saveLocationAndProceed(
  router: ReturnType<typeof useRouter>,
  setLocLoading: (v: boolean) => void,
  setShowLocation: (v: boolean) => void,
  position?: GeolocationPosition,
) {
  if (position) {
    const { latitude, longitude, accuracy } = position.coords;
    const distanceMeters = Math.round(
      getDistanceInKm(latitude, longitude, TARGET_LAT, TARGET_LNG) * 1000,
    );
    localStorage.setItem(
      "@cinedrive:userLocation",
      JSON.stringify({
        latitude,
        longitude,
        accuracy,
        distanceMeters,
        timestamp: Date.now(),
      }),
    );
  } else {
    // Permission denied or geolocation unavailable — save an explicit null entry
    // so downstream code knows a location attempt was made but failed.
    localStorage.setItem(
      "@cinedrive:userLocation",
      JSON.stringify({
        latitude: null,
        longitude: null,
        accuracy: null,
        distanceMeters: null,
        denied: true,
        timestamp: Date.now(),
      }),
    );
  }

  router.push("/cardapio");
  setLocLoading(false);
  setShowLocation(false);
}

export default function HomeClient() {
  const router = useRouter();
  const [config, setConfig] = useState<StoreStatus | null>(null);
  const [name, setName] = useState(() => fromStorage("@cinedrive:name"));
  const [phone, setPhone] = useState(() => fromStorage("@cinedrive:phone"));
  const [spot, setSpot] = useState("");
  const [error, setError] = useState("");
  const [spotModalOpen, setSpotModalOpen] = useState(false);
  const [activeOrders, setActiveOrders] = useState<
    { id: string; number: number }[]
  >([]);
  const [showLocation, setShowLocation] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  function handleAllowLocation() {
    setLocLoading(true);

    if (!navigator.geolocation) {
      // Browser doesn't support geolocation at all
      saveLocationAndProceed(router, setLocLoading, setShowLocation);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Success: got coordinates
        saveLocationAndProceed(
          router,
          setLocLoading,
          setShowLocation,
          position,
        );
      },
      (err) => {
        console.warn("Geolocation error:", err.code, err.message);
        if (err.code === 1) {
          // PERMISSION_DENIED — user explicitly said não, fica na tela inicial
          setLocLoading(false);
          setShowLocation(false);
        } else {
          // POSITION_UNAVAILABLE (2) ou TIMEOUT (3) — não foi escolha do usuário,
          // segue para o cardápio sem localização
          saveLocationAndProceed(router, setLocLoading, setShowLocation);
        }
      },
      {
        timeout: 10000, // 10s — mobile GPS can be slower than desktop
        maximumAge: 60_000, // accept a cached position up to 1 min old
        enableHighAccuracy: false, // don't wait for full GPS lock; network/wifi is fine
      },
    );
  }

  useEffect(() => {
    type SavedOrder = { id: string; number: number };
    const saved: SavedOrder[] = JSON.parse(
      localStorage.getItem("@cinedrive:orders") ?? "[]",
    );
    if (saved.length === 0) return;

    const ids = saved.map((o) => o.id);
    const q = query(collection(db, "orders"), where(documentId(), "in", ids));

    const unsub = onSnapshot(q, (snap) => {
      const activeIds = new Set(
        snap.docs.filter((d) => d.data().status === "active").map((d) => d.id),
      );
      const stillActive = saved.filter((o) => activeIds.has(o.id));
      localStorage.setItem("@cinedrive:orders", JSON.stringify(stillActive));
      setActiveOrders(stillActive);
    });

    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "storeConfig", "main"), (snap) => {
      setConfig(
        snap.exists() ? (snap.data() as StoreStatus) : ({} as StoreStatus),
      );
    });
    return unsub;
  }, []);

  useEffect(() => {
    localStorage.setItem("@cinedrive:name", name.trim());
  }, [name]);

  useEffect(() => {
    localStorage.setItem("@cinedrive:phone", phone);
  }, [phone]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (!name.trim()) {
      setError("Informe seu nome.");
      return;
    }
    if (digits.length < 10) {
      setError("Telefone inválido.");
      return;
    }
    if (!/^\d{3,4}$/.test(spot)) {
      setError("A vaga deve ter 3 ou 4 dígitos.");
      return;
    }
    sessionStorage.setItem("@cinedrive:spot", spot);
    setShowLocation(true);
  }

  if (config === null) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-(--bg)">
        <div className="w-8 h-8 rounded-full border-2 border-(--border) border-t-(--primary) animate-spin" />
      </div>
    );
  }

  if (!config.isOpen) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-dvh gap-5 px-6 text-center bg-(--bg)">
          <Logo />
          {activeOrders.length > 0 && (
            <div className="w-full max-w-xs flex flex-col gap-2">
              {activeOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => router.push(`/pedido?id=${order.id}`)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-(--primary)/10 border border-(--primary)/30 cursor-pointer text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-(--primary)/15 flex items-center justify-center shrink-0">
                    <FaReceipt size={15} className="text-(--primary)" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-(--primary) font-bold text-sm m-0 leading-snug">
                      Pedido #{order.number} em andamento
                    </p>
                    <p className="text-(--text-muted) text-xs m-0 mt-0.5 leading-snug">
                      Toque para acompanhar e conversar
                    </p>
                  </div>
                  <FaChevronRight
                    size={12}
                    className="text-(--primary) shrink-0"
                  />
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-(--text-primary) text-xl font-bold m-0">
              Estamos Fechados
            </h2>
            <p className="text-(--text-secondary) text-sm m-0">
              Horário de Funcionamento da Lanchonete:
            </p>
            {config.openingTime && config.closingTime && (
              <p className="text-(--text-primary) text-[15px] m-0">
                de <strong>{config.openingTime}</strong> até{" "}
                <strong>{config.closingTime}</strong>
              </p>
            )}
          </div>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-(--primary) no-underline"
          >
            <FaWhatsapp size={16} /> Precisa de Ajuda?
          </a>
        </div>
        {showLocation && (
          <LocationModal onAllow={handleAllowLocation} loading={locLoading} />
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4 px-6 py-10 bg-(--bg)">
        <img src="images/logo-drivein.svg" alt="logo" />
        {activeOrders.length > 0 && (
          <div className="w-full max-w-xs flex flex-col gap-2">
            {activeOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => router.push(`/pedido?id=${order.id}`)}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-(--primary)/10 border border-(--primary)/30 cursor-pointer text-left"
              >
                <div className="w-9 h-9 rounded-full bg-(--primary)/15 flex items-center justify-center shrink-0">
                  <FaReceipt size={15} className="text-(--primary)" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-(--primary) font-bold text-sm m-0 leading-snug">
                    Pedido #{order.number} em andamento
                  </p>
                  <p className="text-(--text-muted) text-xs m-0 mt-0.5 leading-snug">
                    Toque para acompanhar e conversar
                  </p>
                </div>
                <FaChevronRight
                  size={12}
                  className="text-(--primary) shrink-0"
                />
              </button>
            ))}
          </div>
        )}
        <p className="text-(--text-primary) text-base text-center m-0">
          Para fazer seu pedido, preencha
          <br />
          os campos abaixo
        </p>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 w-full max-w-xs"
        >
          <input
            type="text"
            placeholder="Nome ou apelido"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            className={inputCls}
          />
          <input
            type="tel"
            inputMode="numeric"
            placeholder="(XX) XXXXX-XXXX"
            value={phone}
            onChange={(e) => {
              setPhone(formatPhone(e.target.value));
              setError("");
            }}
            className={inputCls}
          />
          <div className="flex flex-col gap-1.5">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Vaga"
              value={spot}
              onChange={(e) => {
                setSpot(e.target.value.replace(/\D/g, "").slice(0, 4));
                setError("");
              }}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setSpotModalOpen(true)}
              className="flex items-center gap-1 text-xs text-(--primary) underline bg-transparent border-none cursor-pointer p-0 w-fit"
            >
              <BsInfoCircleFill size={12} />
              Como encontrar minha vaga?
            </button>
          </div>
          {error && <p className="text-(--error) text-sm m-0">{error}</p>}
          <button
            type="submit"
            className="w-full py-3.5 mt-3 rounded-lg bg-(--primary) text-white font-semibold text-[15px] border-none cursor-pointer"
          >
            Ir para o cardápio
          </button>
        </form>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm text-(--primary) no-underline"
        >
          <FaWhatsapp size={16} /> Precisa de Ajuda?
        </a>
      </div>
      {spotModalOpen && (
        <SpotHelpModal onClose={() => setSpotModalOpen(false)} />
      )}
      {showLocation && (
        <LocationModal onAllow={handleAllowLocation} loading={locLoading} />
      )}
    </>
  );
}
