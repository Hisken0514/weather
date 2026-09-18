'use client'
import React, { useEffect, useState } from "react";

const RedisUserList = () => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        // 先呼叫後端的 seed API
        fetch("/api/redis/seed", { method: "POST" })
            .then(() => fetch("/api/redis/users"))
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    setUsers(data[0]); // Redis JSON GET 回傳會包成陣列（[...])
                }
            })
            .catch((err) => console.error("載入資料失敗", err));
    }, []);

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-2">Redis 使用者資料</h2>
            <table className="table-auto w-full border">
                <thead>
                <tr>
                    <th className="border px-4 py-2">ID</th>
                    <th className="border px-4 py-2">Name</th>
                    <th className="border px-4 py-2">Role</th>
                </tr>
                </thead>
                <tbody>
                {users.map((u: any) => (
                    <tr key={u.id}>
                        <td className="border px-4 py-2">{u.id}</td>
                        <td className="border px-4 py-2">{u.name}</td>
                        <td className="border px-4 py-2">{u.role}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

export default RedisUserList;