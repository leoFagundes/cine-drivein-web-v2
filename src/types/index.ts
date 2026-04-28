// ─── Site ─────────────────────────────────────────────────────────────────────

export type FilmClassification = "L" | "6" | "10" | "12" | "14" | "16" | "18" | "";
export type EventType = "" | "christmas" | "halloween" | "easter";
export type SessionKey = "session1" | "session2" | "session3" | "session4";

export interface Film {
  title: string;
  showtime: string;
  image: string;
  classification: FilmClassification;
  synopsis: string;
  director: string;
  writer: string[];
  cast: string[];
  genres: string[];
  duration: string;
  language: string;
  displayDate: string;
  trailer: string;
}

export interface PriceRule {
  label: string;
  days: number[];
  meia: number;
  inteira: number;
}

export interface StoreStatus {
  isOpen: boolean;
  openingTime?: string;
  closingTime?: string;
}

export interface SiteConfig {
  siteUrl: string;
  isClosed: boolean;
  isEvent: EventType;
  popUpEnabled: boolean;
  popUpImage?: string;
  popUpTitle?: string;
  popUpDescriptions?: string[];
  session1?: Film | null;
  session2?: Film | null;
  session3?: Film | null;
  session4?: Film | null;
  prices?: PriceRule[];
}

// ─── Stock ────────────────────────────────────────────────────────────────────

export type AdditionalGroup =
  | "additionals"
  | "additionals_sauce"
  | "additionals_drink"
  | "additionals_sweet";

export interface Subitem {
  id: string;
  name: string;
  description: string;
  isVisible: boolean;
  photo?: string;
}

export interface StockItem {
  id: string;
  codItem: string;
  name: string;
  category: string;
  description: string;
  value: number;
  visibleValue?: number;
  quantity: number;
  photo?: string;
  isVisible: boolean;
  isFeatured: boolean;
  additionals: string[];
  additionals_sauce: string[];
  additionals_drink: string[];
  additionals_sweet: string[];
}

// ─── Order ────────────────────────────────────────────────────────────────────

export interface OrderItem {
  itemId: string;
  codItem: string;
  name: string;
  value: number;
  quantity: number;
  photo?: string;
  observation?: string;
  additionals?: string[];
  additionals_sauce?: string[];
  additionals_drink?: string[];
  additionals_sweet?: string[];
}

export interface CartItem extends OrderItem {
  draftId: string;
}
