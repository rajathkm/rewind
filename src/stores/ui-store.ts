import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  // Sidebar state (desktop)
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;

  // Mobile menu
  mobileMenuOpen: boolean;

  // Reading preferences
  fontSize: "sm" | "base" | "lg" | "xl";
  readerMode: boolean;

  // Theme (respects system by default)
  theme: "system" | "light" | "dark";

  // View preferences
  feedView: "cards" | "list" | "compact";
  sortOrder: "newest" | "oldest" | "unread";

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setFontSize: (size: "sm" | "base" | "lg" | "xl") => void;
  setReaderMode: (enabled: boolean) => void;
  setTheme: (theme: "system" | "light" | "dark") => void;
  setFeedView: (view: "cards" | "list" | "compact") => void;
  setSortOrder: (order: "newest" | "oldest" | "unread") => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      sidebarCollapsed: false,
      sidebarOpen: true,
      mobileMenuOpen: false,
      fontSize: "base",
      readerMode: false,
      theme: "system",
      feedView: "cards",
      sortOrder: "newest",

      // Actions
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleMobileMenu: () =>
        set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

      setFontSize: (size) => set({ fontSize: size }),

      setReaderMode: (enabled) => set({ readerMode: enabled }),

      setTheme: (theme) => set({ theme }),

      setFeedView: (view) => set({ feedView: view }),

      setSortOrder: (order) => set({ sortOrder: order }),
    }),
    {
      name: "rewind-ui-preferences",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        fontSize: state.fontSize,
        theme: state.theme,
        feedView: state.feedView,
        sortOrder: state.sortOrder,
      }),
    }
  )
);
