import React, { useActionState } from 'react';

// 定義計數器的狀態介面，包括計數值和最後更新時間
interface CounterState {
    count: number;         // 計數器的數值
    lastUpdate: string;    // 最後更新的時間字串
}

// 定義計數器可接受的操作類型（Action Types）
type CounterAction =
    | { type: 'INCREMENT' }             // 增加計數
    | { type: 'DECREMENT' }             // 減少計數
    | { type: 'RESET' }                 // 重置計數為 0
    | { type: 'SET_COUNT'; payload: number };  // 設定計數為指定數值

// 初始狀態設置，計數器從 0 開始，並記錄初始化時間
const initialState: CounterState = {
    count: 0,
    lastUpdate: new Date().toLocaleTimeString()  // 初始化時的時間
};

// 定義一個模擬非同步延遲的函數，模擬 API 請求等操作
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 非同步 Reducer 函數，根據不同的操作類型更新狀態
const counterReducer =  (state: CounterState, action: CounterAction) => {
    // 模擬 1 秒延遲
     delay(1000);

    // 根據 action 類型更新狀態
    switch (action.type) {
        case 'INCREMENT':  // 增加計數
            return {
                count: state.count + 1,
                lastUpdate: new Date().toLocaleTimeString()  // 更新當前時間
            };

        case 'DECREMENT':  // 減少計數
            return {
                count: state.count - 1,
                lastUpdate: new Date().toLocaleTimeString()
            };

        case 'RESET':  // 重置計數
            return {
                count: 0,
                lastUpdate: new Date().toLocaleTimeString()
            };

        case 'SET_COUNT':  // 設定計數為指定數值
            return {
                count: action.payload,  // 從 action 取得指定數值
                lastUpdate: new Date().toLocaleTimeString()
            };

        default:
            return state;  // 如果操作類型不匹配，返回當前狀態
    }
};

// 主元件：計數器
export default function Counter() {
    // 使用 useActionState 管理狀態，並處理非同步更新
    const [state, formAction, isPending] = useActionState(counterReducer, initialState);

    return (
        <div className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-md space-y-4">
            {/* 計數器顯示區域 */}
            <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">計數器</h2>
                <p className="text-4xl font-bold">{state.count}</p>  {/* 顯示當前計數 */}
                <p className="text-sm text-gray-500">
                    最後更新: {state.lastUpdate}  {/* 顯示最後更新時間 */}
                </p>
                {/* 如果正在處理非同步操作，顯示處理中提示 */}
                {isPending && (
                    <p className="text-blue-500">處理中...</p>
                )}
            </div>

            {/* 操作按鈕區域 */}
            <div className="flex justify-center space-x-2">
                {/* 減少按鈕 */}
                <button
                    onClick={() => formAction({ type: 'DECREMENT' })}  // 點擊後觸發 DECREMENT 操作
                    disabled={isPending}  // 如果非同步操作正在進行，按鈕禁用
                    className="px-4 py-2 bg-red-500 text-white rounded-md disabled:opacity-50"
                >
                    減少
                </button>

                {/* 重置按鈕 */}
                <button
                    onClick={() => formAction({ type: 'RESET' })}  // 點擊後觸發 RESET 操作
                    disabled={isPending}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md disabled:opacity-50"
                >
                    重置
                </button>

                {/* 增加按鈕 */}
                <button
                    onClick={() => formAction({ type: 'INCREMENT' })}  // 點擊後觸發 INCREMENT 操作
                    disabled={isPending}
                    className="px-4 py-2 bg-green-500 text-white rounded-md disabled:opacity-50"
                >
                    增加
                </button>
            </div>

            {/* 設定計數器數值為 100 的按鈕 */}
            <div className="text-center">
                <button
                    onClick={() => formAction({ type: 'SET_COUNT', payload: 100 })}  // 點擊後設定計數為 100
                    disabled={isPending}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50"
                >
                    設為 100
                </button>
            </div>
        </div>
    );
}