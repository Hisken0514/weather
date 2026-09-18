"use client";
export default function CategoriesView() {
    const items = [
        { id: 0, name: "基礎型", desc: "所有公司共同使用的指標。" },
        { id: 1, name: "客製型", desc: "特定組織自定的客製指標。" },
        { id: 2, name: "麥寮台塑", desc: "特殊案例／專案類別（示例）。" },
    ];
    return (
        <div className="bg-white border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-2">指標類別（唯讀）</h3>
            <p className="text-sm text-gray-500 mb-4">此頁為 enum 對照說明；如需增修，請在後端 enum 與對映策略修改。</p>
            <table className="w-full text-sm">
                <thead><tr className="bg-gray-50"><th className="p-2 w-20">ID</th><th className="p-2">名稱</th><th className="p-2">說明</th></tr></thead>
                <tbody>
                {items.map(x=>(
                    <tr key={x.id} className="border-t">
                        <td className="p-2 text-center">{x.id}</td>
                        <td className="p-2">{x.name}</td>
                        <td className="p-2 text-gray-600">{x.desc}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
