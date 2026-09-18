import dayjs from "dayjs";

type KnownFormats = "DD MM" | "DD MM YYYY" | "DD MMM" | "MMM YYYY";

type IDateProps = {
    onlyDate?: boolean;
    format?: KnownFormats | string;
};

const defaultProps: IDateProps = { onlyDate: true };

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatted = (date: Date, props: IDateProps = defaultProps) => {
    let format = "";
    if (props.format) {
        format = props.format;
    } else {
        if (props.onlyDate) format += "DD MMM YYYY";
    }

    return dayjs(date).format(format);
};

const minusMinutes = (minutes: number = 1, date: Date = new Date()): Date => {
    return addMinutes(-minutes, date);
};

const addMinutes = (minutes: number = 1, date: Date = new Date()): Date => {
    const d = date;
    d.setMinutes(date.getMinutes() + minutes);
    return d;
};
const minusDays = (days: number = 1, date: Date = new Date()): Date => {
    return addDays(-days, date);
};

const addDays = (days: number = 1, date: Date = new Date()): Date => {
    const d = date;
    d.setDate(date.getDate() + days);
    return d;
};
const minusMonths = (month: number = 1, date: Date = new Date()): Date => {
    return addMonths(-month, date);
};

const addMonths = (month: number = 1, date: Date = new Date()): Date => {
    const d = date;
    d.setMonth(date.getMonth() + month);
    return d;
};

const minusYears = (year: number = 1, date: Date = new Date()): Date => {
    return addYears(-year, date);
};

const addYears = (year: number = 1, date: Date = new Date()): Date => {
    const d = date;
    d.setFullYear(date.getFullYear() + year);
    return d;
};

const getPastMonths = (count: number) => {
    const currentMonthIndex = new Date().getMonth();
    const pastMonths = [];

    for (let i = 1; i <= count; i++) {
        const index = (currentMonthIndex - i + 12) % 12;
        pastMonths.unshift(monthNames[index]);
    }

    return pastMonths;
};

const getPastDateTimes = (count: number, date?: Date) => {
    const startDate = date ? new Date(date) : new Date();
    const pastDateTimes = [];
    while (pastDateTimes.length < count) {
        pastDateTimes.push(new Date(dateHelper.minusDays(1, startDate)).getTime());
    }
    return pastDateTimes;
};

export const dateHelper = {
    formatted,
    minusDays,
    addDays,
    addMonths,
    minusMonths,
    minusYears,
    addYears,
    addMinutes,
    minusMinutes,
    monthNames,
    getPastMonths,
    getPastDateTimes,
};
