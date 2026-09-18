import { create } from 'zustand';

interface AiChatState {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

export const useAiChatStore = create<AiChatState>()((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
