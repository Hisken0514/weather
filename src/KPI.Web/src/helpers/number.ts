const generateRandomIntegerAround = (value: number, maxVariation: number) => {
    return Math.floor(Math.random() * maxVariation * 2 + 1) + (value - maxVariation);
};

export const numberHelper = {
    generateRandomIntegerAround,
};
