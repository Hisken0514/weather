"use client";
import React from "react";

export type OrgType = { id: number; code: string; name: string };
export type OrgTreeNode = {
    id: number; name: string; typeCode: string; isActive: boolean;
    code?: string|null; address?: string|null; contactPerson?: string|null;
    contactPhone?: string|null; taxId?: string|null; children?: OrgTreeNode[];
};

export type OrgUpsertDto = {
    name: string;
    typeId: number;
    parentId?: number | null;
    code?: string | null;
    address?: string | null;
    contactPerson?: string | null;
    contactPhone?: string | null;
    taxId?: string | null;
    isActive?: boolean;
    useParentDomainVerification?: boolean;
};

type Props = {
    mode: "create" | "edit";
    initial?: Partial<OrgUpsertDto>;
    types: OrgType[];
    parentOptions: { id: number; label: string }[];
    defaultParentId?: number | null;
    onSubmit: (dto: OrgUpsertDto) => Promise<void>;
    onCancel: () => void;
};

export default function OrgForm({
                                    mode, initial, types, parentOptions, defaultParentId = null, onSubmit, onCancel,
                                }: Props) {
    const [form, setForm] = React.useState<OrgUpsertDto>({
        name: initial?.name ?? "",
        typeId: initial?.typeId ?? (types[0]?.id ?? 0),
        parentId: initial?.parentId ?? defaultParentId ?? null,
        code: initial?.code ?? null,
        address: initial?.address ?? null,
        contactPerson: initial?.contactPerson ?? null,
        contactPhone: initial?.contactPhone ?? null,
        taxId: initial?.taxId ?? null,
        isActive: initial?.isActive ?? true,
        useParentDomainVerification: initial?.useParentDomainVerification ?? false,
    });
    const [submitting, setSubmitting] = React.useState(false);
    const [err, setErr] = React.useState<string | null>(null);

    const update = (k: keyof OrgUpsertDto, v: any) => setForm((s) => ({ ...s, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        if (!form.name.trim()) { setErr("請輸入名稱"); return; }
        if (!form.typeId) { setErr("請選擇類型"); return; }
        setSubmitting(true);
        try {
            await onSubmit(form);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {err && <div className="text-red-600 text-sm">{err}</div>}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-600 mb-1">名稱 *</label>
                    <input
                        className="w-full border rounded-lg px-3 py-2"
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder="輸入組織名稱"
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-600 mb-1">類型 *</label>
                    <select
                        className="w-full border rounded-lg px-3 py-2"
                        value={form.typeId}
                        onChange={(e) => update("typeId", Number(e.target.value))}
                    >
                        {types.map((t) => (
                            <option key={t.id} value={t.id}>{`${t.name} (${t.code})`}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm text-gray-600 mb-1">父節點（可選）</label>
                    <select
                        className="w-full border rounded-lg px-3 py-2"
                        value={form.parentId ?? ""}
                        onChange={(e) => update("parentId", e.target.value ? Number(e.target.value) : null)}
                    >
                        <option value="">（無）</option>
                        {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm text-gray-600 mb-1">代碼</label>
                    <input className="w-full border rounded-lg px-3 py-2"
                           value={form.code ?? ""} onChange={(e)=>update("code", e.target.value || null)} />
                </div>

                <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">地址</label>
                    <input className="w-full border rounded-lg px-3 py-2"
                           value={form.address ?? ""} onChange={(e)=>update("address", e.target.value || null)} />
                </div>

                <div>
                    <label className="block text-sm text-gray-600 mb-1">聯絡人</label>
                    <input className="w-full border rounded-lg px-3 py-2"
                           value={form.contactPerson ?? ""} onChange={(e)=>update("contactPerson", e.target.value || null)} />
                </div>

                <div>
                    <label className="block text-sm text-gray-600 mb-1">聯絡電話</label>
                    <input className="w-full border rounded-lg px-3 py-2"
                           value={form.contactPhone ?? ""} onChange={(e)=>update("contactPhone", e.target.value || null)} />
                </div>

                <div>
                    <label className="block text-sm text-gray-600 mb-1">統編/稅籍</label>
                    <input className="w-full border rounded-lg px-3 py-2"
                           value={form.taxId ?? ""} onChange={(e)=>update("taxId", e.target.value || null)} />
                </div>

                <label className="inline-flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={!!form.isActive} onChange={(e)=>update("isActive", e.target.checked)} />
                    <span className="text-sm text-gray-700">啟用</span>
                </label>

                <label className="inline-flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={!!form.useParentDomainVerification}
                           onChange={(e)=>update("useParentDomainVerification", e.target.checked)} />
                    <span className="text-sm text-gray-700">沿用父節點的域名驗證</span>
                </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel} className="px-3 py-2 border rounded-lg">取消</button>
                <button type="submit" disabled={submitting}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                    {mode === "create" ? "新增" : "儲存"}
                </button>
            </div>
        </form>
    );
}
