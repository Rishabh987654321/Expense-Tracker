import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      org: null,

      setSession: ({ token, user, org }) => set({ token, user, org }),
      clear: () => set({ token: null, user: null, org: null }),

      hasRole: (...roles) => {
        const r = get().user?.role;
        if (!r) return false;
        return roles.flat().includes(r);
      },
    }),
    {
      name: 'expense-tracker-auth',
      partialize: (s) => ({ token: s.token, user: s.user, org: s.org }),
    }
  )
);
