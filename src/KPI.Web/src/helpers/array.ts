const toggleItem = <T>(array: Array<T>, item: T): Array<T> => {
    if (array.includes(item)) {
        return array.filter((arr) => arr !== item);
    } else {
        return [...array, item];
    }
};

export const arrayHelper = {
    toggleItem,
};
