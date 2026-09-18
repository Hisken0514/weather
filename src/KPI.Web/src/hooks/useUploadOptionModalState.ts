import { useState } from "react";

export function useUploadOptionModalState() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const openModal = () => setIsOpen(true);
    const closeModal = () => {
        setIsOpen(false);
        setActiveIndex(null);
    };
    const toggle = (index: number) => {
        setActiveIndex(prev => (prev === index ? null : index));
    };

    return {
        isOpen,
        activeIndex,
        toggle,
        openModal,
        closeModal
    };
}