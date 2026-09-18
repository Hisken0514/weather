import { create } from "zustand";

interface FormState {
    name: string;
    email: string;
    password: string;
}

interface TestStore {
    form: FormState[]; // 初始值應該是陣列
    setFormState: (formState: FormState[]) => void;
}

export const useTestStore = create<TestStore>((set) => ({
    form: [], // 初始狀態為空陣列
    setFormState: (formState: FormState[]) =>
        set(() => ({
            form: formState, // 正確設定 form
        })),
}));
