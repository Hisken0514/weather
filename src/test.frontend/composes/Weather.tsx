"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { weatherService } from "@/services/WeatherService";
import { WeatherItem } from "@/types/WheatherTypes";
import React from 'react';
import { useDeleteModal } from "@/hooks/useDeleteDialog";

const ITEMS_PER_PAGE = 6; // 每頁顯示 6 筆資料

export default function DashboardPage() {
    const [weatherList, setWeatherList] = useState<WeatherItem[]>([]);
    const [loading, setLoading] = useState(true);

    // --- 分頁與網址參數控制 ---
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // 1. 從 URL 取得當前頁碼 (例如 ?page=2)，沒有就預設第 1 頁
    const currentPage = Number(searchParams.get("page")) || 1;

    // 2. 計算總頁數與當頁資料切片
    const totalPages = Math.ceil(weatherList.length / ITEMS_PER_PAGE) || 1;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentList = weatherList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // 3. 切換頁碼韓式（寫入 URL Query）
    const goToPage = (pageNumber: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", pageNumber.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const {
        selectedItem: deleteItem,
        openDeleteModal,
        DeleteModal,
    } = useDeleteModal<WeatherItem>({
        onDelete: async (item) => {
            await weatherService.deleteWeather(item.date);
        },
        onSuccess: () => {
            if (deleteItem) {
                setWeatherList((prev) => prev.filter((item) => item.date !== deleteItem.date));
            }
        },
    });

    // --- Modal 狀態控制 (新增/修改) ---
    const [, setEditingItem] = useState<WeatherItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // --- 表單狀態 ---
    const [formData, setFormData] = useState<WeatherItem>({
        date: new Date().toISOString().split("T")[0],
        temperatureC: 25,
        summary: "Warm",
    });

    // 取得 API 資料
    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                const data = await weatherService.getWeather();
                if (isMounted) {
                    setWeatherList(data);
                }
            } catch (err) {
                console.error("載入失敗:", err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData().catch((err) => {
            console.error("Uncaught error in fetchData:", err);
        });

        return () => {
            isMounted = false;
        };
    }, []);

    // --- 新增 (CREATE) 邏輯 ---
    const handleOpenCreateModal = () => {
        setFormData({
            date: new Date().toISOString().split("T")[0],
            temperatureC: 25,
            summary: "Warm",
        });
        setIsCreateModalOpen(true);
    };

    const handleConfirmCreate = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        try {
            const responseData = await weatherService.createWeather(formData);
            const newItem: WeatherItem = (responseData && responseData.date) ? responseData : { ...formData };

            // 新增資料到最前面，並切換到第 1 頁看最新項目
            setWeatherList((prev) => [newItem, ...prev]);
            goToPage(1);
            setIsCreateModalOpen(false);
        } catch (err) {
            console.error("新增失敗:", err);
            alert("新增失敗，請再試一次");
        }
    };

    // --- 修改 (UPDATE) 邏輯 ---
    const handleOpenEditModal = (item: WeatherItem) => {
        setEditingItem(item);
        setFormData({ ...item });
        setIsEditModalOpen(true);
    };

    const handleConfirmEdit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        try {
            await weatherService.updateWeather(formData);
            setWeatherList((prev) =>
                prev.map((item) => (item.date === formData.date ? { ...formData } : item))
            );
            setIsEditModalOpen(false);
            setEditingItem(null);
        } catch (err) {
            console.error("更新失敗:", err);
            alert("更新失敗");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-10">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">天氣預報 Dashboard</h1>
                <button onClick={handleOpenCreateModal} className="btn btn-primary">
                    + 新增氣象
                </button>
            </div>

            {/* 卡片列表 (改渲染當頁切割後的 currentList) */}
            {currentList.length > 0 ? (
                <div className="flex flex-wrap gap-4 min-h-[300px]">
                    {currentList.map((item, index) => (
                        <div key={item.date || index} className="card bg-neutral text-neutral-content w-80">
                            <div className="card-body">
                                <h2 className="card-title justify-between">
                                    {item.date}
                                    <span className="badge badge-secondary">{item.temperatureC} °C</span>
                                </h2>
                                <p>{item.summary || "無描述"}</p>
                                <div className="card-actions justify-end mt-4">
                                    <button
                                        onClick={() => handleOpenEditModal(item)}
                                        className="btn btn-warning btn-sm"
                                    >
                                        修改
                                    </button>
                                    <button
                                        onClick={() => openDeleteModal(item)}
                                        className="btn btn-error btn-sm"
                                    >
                                        刪除
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 text-gray-500">尚無資料</div>
            )}

            {/* --- 分頁控制按鈕 (Pagination) --- */}
            {weatherList.length > 0 && (
                <div className="flex justify-center items-center gap-2 pt-4">
                    <div className="join">
                        <button
                            disabled={currentPage <= 1}
                            onClick={() => goToPage(currentPage - 1)}
                            className="join-item btn btn-outline btn-sm"
                        >
                            « 上一頁
                        </button>
                        <button className="join-item btn btn-sm btn-active">
                            第 {currentPage} / {totalPages} 頁
                        </button>
                        <button
                            disabled={currentPage >= totalPages}
                            onClick={() => goToPage(currentPage + 1)}
                            className="join-item btn btn-outline btn-sm"
                        >
                            下一頁 »
                        </button>
                    </div>
                </div>
            )}

            {/* --- 1. 新增 Modal --- */}
            <div className={`modal ${isCreateModalOpen ? "modal-open" : ""}`} role="dialog">
                <div className="modal-box">
                    <h3 className="text-lg font-bold">新增天氣資料</h3>
                    <form onSubmit={handleConfirmCreate} className="space-y-4 py-4">
                        <div>
                            <label className="label">日期</label>
                            <input
                                type="date"
                                className="input input-bordered w-full"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">溫度 (°C)</label>
                            <input
                                type="number"
                                className="input input-bordered w-full"
                                value={formData.temperatureC}
                                onChange={(e) => setFormData({ ...formData, temperatureC: Number(e.target.value) })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">天氣概況</label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={formData.summary || ""}
                                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                required
                            />
                        </div>
                        <div className="modal-action">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => setIsCreateModalOpen(false)}
                            >
                                取消
                            </button>
                            <button type="submit" className="btn btn-primary">
                                確認新增
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* --- 2. 修改 Modal --- */}
            <div className={`modal ${isEditModalOpen ? "modal-open" : ""}`} role="dialog">
                <div className="modal-box">
                    <h3 className="text-lg font-bold">修改天氣資料</h3>
                    <form onSubmit={handleConfirmEdit} className="space-y-4 py-4">
                        <div>
                            <label className="label">日期 (鍵值不可修改)</label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={formData.date}
                                disabled
                            />
                        </div>
                        <div>
                            <label className="label">溫度 (°C)</label>
                            <input
                                type="number"
                                className="input input-bordered w-full"
                                value={formData.temperatureC}
                                onChange={(e) => setFormData({ ...formData, temperatureC: Number(e.target.value) })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">天氣概況</label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={formData.summary || ""}
                                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                required
                            />
                        </div>
                        <div className="modal-action">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => setIsEditModalOpen(false)}
                            >
                                取消
                            </button>
                            <button type="submit" className="btn btn-warning">
                                儲存修改
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* --- 3. 刪除確認 Modal --- */}
            <DeleteModal />
        </div>
    );
}