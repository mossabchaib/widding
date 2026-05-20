import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  serviceId: string;
  providerId: string;
  name: string;
  price: number;
  photo?: string;
  wilaya?: string;
  providerName?: string;
};

type CartState = {
  items: CartItem[];
  add: (i: CartItem) => void;
  remove: (serviceId: string) => void;
  clear: () => void;
  has: (serviceId: string) => boolean;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (i) =>
        set((s) =>
          s.items.find((x) => x.serviceId === i.serviceId)
            ? s
            : { items: [...s.items, i] }
        ),
      remove: (id) =>
        set((s) => ({ items: s.items.filter((x) => x.serviceId !== id) })),
      clear: () => set({ items: [] }),
      has: (id) => !!get().items.find((x) => x.serviceId === id),
    }),
    { name: "mathani-cart" }
  )
);
