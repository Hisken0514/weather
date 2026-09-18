"use client";

import { colorHelper } from "./color";

const changePrimaryColor = (color: string) => {
    const root = document.querySelector<HTMLElement>("[data-theme=light]");
    const hslColor = colorHelper.hexToHSL(color);
    if (hslColor && root) {
        root.style.setProperty(`--p`, hslColor);
    }
};

export const domHelper = {
    changePrimaryColor,
};
