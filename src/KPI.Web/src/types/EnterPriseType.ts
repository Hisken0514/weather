// types/enterPrise.ts

export interface Factory {
    id: string;
    name: string;
}

export interface Company {
    id: string;
    name: string;
    children: Factory[]; // 工廠列表
}

export interface Enterprise {
    id: string;
    name: string;
    children: Company[]; // 公司列表
}