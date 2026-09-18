import { hsl } from "culori";

const hexToHSL = (hex: string): string | null => {
    const hslObject = hsl(hex);
    if (hslObject) return `${hslObject.s}% ${hslObject.l * 360} ${hslObject.h}`;
    return null;
};

export const colorHelper = {
    hexToHSL,
};
