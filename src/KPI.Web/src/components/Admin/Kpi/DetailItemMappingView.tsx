'use client';

import React from 'react';
import api from '@/services/apiService';
import { toast } from 'react-hot-toast';
import { getAccessToken } from '@/services/serverAuthService';
import { Search, X, Plus, Pencil, Trash2 } from 'lucide-react';

type MappingDto = {
    id: number;
    groupId: number;
    oldKpiItemId: number;
    oldIndicatorName?: string | null;
    newKpiItemId: number;
    newIndicatorName?: string | null;
    oldDetailItemId?: number | null;
    oldDetailItemName?: string | null;
    newDetailItemId?: number | null;
    newDetailItemName?: string | null;
};

type GroupDto = {
    id: number;
    name: string;
    effectiveYear: number;
    note?: string | null;
    createdByEmail: string;
    createdAt: string;
    mappings: MappingDto[];
};

type ItemRow = {
    id: number;
    indicatorNumber: number;
    kpiFieldName: string;
    organizationName?: string | null;
    displayName: string;
};

type DetailItemOption = {
    id: number;
    unit: string;
    isIndicator: boolean;
    names: { name: string; startYear: number; endYear?: number | null }[];
};

// detailItemId 為 null 代表「不限定細項」，涵蓋這個指標項目底下全部細項
type PickedDetailItem = { kpiItemId: number; itemDisplayName: string; detailItemId: number | null; detailLabel: string };

async function authHeaders() {
    const token = await getAccessToken();
    return { headers: { Authorization: token ? `Bearer ${token.value}` : '' } };
}

function latestName(names: { name: string; startYear: number }[]) {
    if (!names?.length) return '(未命名)';
    return [...names].sort((a, b) => b.startYear - a.startYear)[0].name;
}

// 搜尋指標 → 選一個指標細項（Unit）的挑選器
function DetailItemPicker({
    label,
    selected,
    onChange,
}: {
    label: string;
    selected: PickedDetailItem | null;
    onChange: (v: PickedDetailItem | null) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const [q, setQ] = React.useState('');
    const [items, setItems] = React.useState<ItemRow[]>([]);
    const [activeItem, setActiveItem] = React.useState<ItemRow | null>(null);
    const [details, setDetails] = React.useState<DetailItemOption[]>([]);
    const [loading, setLoading] = React.useState(false);

    const searchItems = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/Admin/kpi/items', {
                params: { page: 1, pageSize: 20, q: q.trim() || undefined },
                ...(await authHeaders()),
            });
            setItems(data.items ?? []);
        } catch {
            toast.error('搜尋指標失敗');
        } finally {
            setLoading(false);
        }
    };

    const pickItem = async (item: ItemRow) => {
        setActiveItem(item);
        try {
            const { data } = await api.get(`/Admin/kpi/items/${item.id}`, await authHeaders());
            setDetails(data.detailItems ?? []);
        } catch {
            toast.error('讀取指標細項失敗');
        }
    };

    const pickDetail = (d: DetailItemOption) => {
        onChange({
            kpiItemId: activeItem!.id,
            detailItemId: d.id,
            itemDisplayName: activeItem?.displayName ?? '',
            detailLabel: `${latestName(d.names)}（單位：${d.unit}）`,
        });
        setOpen(false);
        setActiveItem(null);
        setDetails([]);
        setQ('');
        setItems([]);
    };

    const pickWholeItem = () => {
        onChange({
            kpiItemId: activeItem!.id,
            detailItemId: null,
            itemDisplayName: activeItem?.displayName ?? '',
            detailLabel: '（全部細項，用名稱自動配對）',
        });
        setOpen(false);
        setActiveItem(null);
        setDetails([]);
        setQ('');
        setItems([]);
    };

    return (
        <div>
            <div className="text-sm font-medium text-gray-700 mb-1">{label}</div>
            {selected ? (
                <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-gray-50">
                    <div className="text-sm">
                        <div className="font-medium text-gray-800">{selected.itemDisplayName}</div>
                        <div className="text-gray-500">
                            {selected.detailLabel}
                            {selected.detailItemId != null && `（DetailItemId：${selected.detailItemId}）`}
                        </div>
                    </div>
                    <button className="p-1 text-gray-400 hover:text-red-600" onClick={() => onChange(null)}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <button
                    className="w-full border-2 border-dashed rounded-lg px-3 py-2 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 flex items-center gap-2"
                    onClick={() => setOpen(true)}
                >
                    <Search className="w-4 h-4" /> 搜尋並選擇指標細項
                </button>
            )}

            {open && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-6 z-50">
                    <div className="bg-white rounded-xl shadow p-5 w-[640px] max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-800">{label}</h4>
                            <button onClick={() => { setOpen(false); setActiveItem(null); }} className="p-1 hover:bg-gray-100 rounded">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {!activeItem ? (
                            <>
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 border rounded px-3 py-2 text-sm"
                                        placeholder="輸入指標名稱或細項名稱關鍵字..."
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && searchItems()}
                                    />
                                    <button className="px-3 py-2 border rounded text-sm" onClick={searchItems} disabled={loading}>
                                        搜尋
                                    </button>
                                </div>
                                <div className="mt-3 divide-y max-h-80 overflow-y-auto">
                                    {items.map((it) => (
                                        <button
                                            key={it.id}
                                            className="w-full text-left py-2 px-2 hover:bg-gray-50 text-sm"
                                            onClick={() => pickItem(it)}
                                        >
                                            <div className="font-medium text-gray-800">{it.displayName}</div>
                                            <div className="text-gray-500 text-xs">
                                                {it.kpiFieldName} · {it.organizationName ?? '基礎型'} · 編號 {it.indicatorNumber}
                                            </div>
                                        </button>
                                    ))}
                                    {items.length === 0 && (
                                        <div className="text-center text-gray-400 text-sm py-6">請輸入關鍵字搜尋</div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <button className="text-xs text-indigo-600 mb-2" onClick={() => setActiveItem(null)}>
                                    ← 回到搜尋結果
                                </button>
                                <button
                                    className="w-full text-left py-2 px-2 mb-1 rounded bg-indigo-50 hover:bg-indigo-100 text-sm"
                                    onClick={pickWholeItem}
                                >
                                    <div className="font-medium text-indigo-700">整個指標（全部細項）</div>
                                    <div className="text-indigo-500 text-xs">不指定特定細項，查詢時用名稱自動配對這個指標底下的每一筆細項</div>
                                </button>
                                <div className="text-sm text-gray-600 mb-2">或選擇特定細項：</div>
                                <div className="divide-y max-h-80 overflow-y-auto">
                                    {details.map((d) => (
                                        <button
                                            key={d.id}
                                            className="w-full text-left py-2 px-2 hover:bg-gray-50 text-sm"
                                            onClick={() => pickDetail(d)}
                                        >
                                            <div className="font-medium text-gray-800">{latestName(d.names)}</div>
                                            <div className="text-gray-500 text-xs">單位：{d.unit || '-'}（DetailItemId：{d.id}）</div>
                                        </button>
                                    ))}
                                    {details.length === 0 && (
                                        <div className="text-center text-gray-400 text-sm py-6">這個指標底下還沒有細項</div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// 新增/編輯單筆對照的表單（掛在某個群組底下）
function MappingForm({
    initialOld,
    initialNew,
    submitLabel,
    onCancel,
    onSubmit,
}: {
    initialOld?: PickedDetailItem;
    initialNew?: PickedDetailItem;
    submitLabel: string;
    onCancel: () => void;
    onSubmit: (oldPick: PickedDetailItem, newPick: PickedDetailItem) => Promise<void>;
}) {
    const [oldPick, setOldPick] = React.useState<PickedDetailItem | null>(initialOld ?? null);
    const [newPick, setNewPick] = React.useState<PickedDetailItem | null>(initialNew ?? null);
    const [submitting, setSubmitting] = React.useState(false);

    const submit = async () => {
        if (!oldPick || !newPick) {
            toast.error('請選擇舊指標細項和新指標細項');
            return;
        }
        setSubmitting(true);
        try {
            await onSubmit(oldPick, newPick);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="border rounded-lg p-4 bg-indigo-50/40 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailItemPicker label="舊指標（改名/換單位前）" selected={oldPick} onChange={setOldPick} />
                <DetailItemPicker label="新指標（改名/換單位後）" selected={newPick} onChange={setNewPick} />
            </div>
            <div className="mt-3 flex gap-2">
                <button
                    onClick={submit}
                    disabled={submitting}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                    {submitLabel}
                </button>
                <button onClick={onCancel} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">
                    取消
                </button>
            </div>
        </div>
    );
}

// 統一的編輯／刪除按鈕樣式，群組卡片跟對照列表共用同一套
function RowActionButton({
    icon: Icon,
    label,
    tone,
    onClick,
}: {
    icon: typeof Pencil;
    label: string;
    tone: 'edit' | 'delete';
    onClick: () => void;
}) {
    const toneClass =
        tone === 'edit'
            ? 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
            : 'text-gray-500 hover:text-red-600 hover:bg-red-50';
    return (
        <button onClick={onClick} title={label} className={`inline-flex items-center gap-1.5 p-2 rounded-lg text-sm ${toneClass}`}>
            <Icon className="w-4 h-4" />
            <span className="sr-only">{label}</span>
        </button>
    );
}

function GroupCard({ group, onChanged }: { group: GroupDto; onChanged: () => void }) {
    const [editingGroup, setEditingGroup] = React.useState(false);
    const [name, setName] = React.useState(group.name);
    const [effectiveYear, setEffectiveYear] = React.useState(group.effectiveYear);
    const [note, setNote] = React.useState(group.note ?? '');
    const [addingMapping, setAddingMapping] = React.useState(false);
    const [editingMappingId, setEditingMappingId] = React.useState<number | null>(null);

    const saveGroup = async () => {
        if (!name.trim()) {
            toast.error('計畫名稱必填');
            return;
        }
        try {
            await api.put(
                `/Admin/kpi/detail-item-mapping-groups/${group.id}`,
                { name: name.trim(), effectiveYear, note: note.trim() || null },
                await authHeaders()
            );
            toast.success('已更新修訂計畫');
            setEditingGroup(false);
            onChanged();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? '更新失敗');
        }
    };

    const deleteGroup = async () => {
        if (!confirm(`確定要刪除「${group.name}」這個修訂計畫嗎？底下 ${group.mappings.length} 筆對照會一併刪除。`)) return;
        try {
            await api.delete(`/Admin/kpi/detail-item-mapping-groups/${group.id}`, await authHeaders());
            toast.success('已刪除修訂計畫');
            onChanged();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? '刪除失敗');
        }
    };

    const addMapping = async (oldPick: PickedDetailItem, newPick: PickedDetailItem) => {
        try {
            await api.post(
                `/Admin/kpi/detail-item-mapping-groups/${group.id}/mappings`,
                {
                    oldKpiItemId: oldPick.kpiItemId,
                    newKpiItemId: newPick.kpiItemId,
                    oldDetailItemId: oldPick.detailItemId,
                    newDetailItemId: newPick.detailItemId,
                },
                await authHeaders()
            );
            toast.success('已新增對照，查詢時會自動合併顯示');
            setAddingMapping(false);
            onChanged();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? '新增失敗');
        }
    };

    const updateMapping = async (mappingId: number, oldPick: PickedDetailItem, newPick: PickedDetailItem) => {
        try {
            await api.put(
                `/Admin/kpi/detail-item-mappings/${mappingId}`,
                {
                    oldKpiItemId: oldPick.kpiItemId,
                    newKpiItemId: newPick.kpiItemId,
                    oldDetailItemId: oldPick.detailItemId,
                    newDetailItemId: newPick.detailItemId,
                },
                await authHeaders()
            );
            toast.success('已更新對照');
            setEditingMappingId(null);
            onChanged();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? '更新失敗');
        }
    };

    const deleteMapping = async (mappingId: number) => {
        if (!confirm('確定要刪除這筆對照嗎？刪除後查詢畫面會把新舊資料拆開顯示。')) return;
        try {
            await api.delete(`/Admin/kpi/detail-item-mappings/${mappingId}`, await authHeaders());
            toast.success('已刪除');
            onChanged();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? '刪除失敗');
        }
    };

    return (
        <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
                {editingGroup ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                            className="border rounded px-3 py-1.5 text-sm md:col-span-1"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="修訂計畫名稱"
                        />
                        <input
                            type="number"
                            className="border rounded px-3 py-1.5 text-sm"
                            value={effectiveYear}
                            onChange={(e) => setEffectiveYear(parseInt(e.target.value || '0', 10))}
                            placeholder="生效年度"
                        />
                        <input
                            className="border rounded px-3 py-1.5 text-sm"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="備註"
                        />
                        <div className="md:col-span-3 flex gap-2">
                            <button onClick={saveGroup} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">
                                儲存
                            </button>
                            <button
                                onClick={() => { setEditingGroup(false); setName(group.name); setEffectiveYear(group.effectiveYear); setNote(group.note ?? ''); }}
                                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-100"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-800">{group.name}</h4>
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                    {group.effectiveYear} 年生效
                                </span>
                            </div>
                            {group.note && <p className="text-sm text-gray-500 mt-1">{group.note}</p>}
                            <p className="text-xs text-gray-400 mt-1">建立者：{group.createdByEmail}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                            <RowActionButton icon={Pencil} label="編輯計畫" tone="edit" onClick={() => setEditingGroup(true)} />
                            <RowActionButton icon={Trash2} label="刪除計畫" tone="delete" onClick={deleteGroup} />
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left">舊指標</th>
                            <th className="px-3 py-2 text-left">新指標</th>
                            <th className="px-3 py-2 text-center">操作</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {group.mappings.map((m) =>
                            editingMappingId === m.id ? (
                                <tr key={m.id}>
                                    <td colSpan={3} className="px-3 py-2">
                                        <MappingForm
                                            initialOld={{
                                                kpiItemId: m.oldKpiItemId,
                                                itemDisplayName: m.oldIndicatorName ?? '',
                                                detailItemId: m.oldDetailItemId ?? null,
                                                detailLabel: m.oldDetailItemId != null ? (m.oldDetailItemName ?? '') : '（全部細項，用名稱自動配對）',
                                            }}
                                            initialNew={{
                                                kpiItemId: m.newKpiItemId,
                                                itemDisplayName: m.newIndicatorName ?? '',
                                                detailItemId: m.newDetailItemId ?? null,
                                                detailLabel: m.newDetailItemId != null ? (m.newDetailItemName ?? '') : '（全部細項，用名稱自動配對）',
                                            }}
                                            submitLabel="儲存"
                                            onCancel={() => setEditingMappingId(null)}
                                            onSubmit={(o, n) => updateMapping(m.id, o, n)}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                <tr key={m.id}>
                                    <td className="px-3 py-2">
                                        <div className="font-medium">{m.oldIndicatorName}</div>
                                        <div className="text-gray-500 text-xs">
                                            {m.oldDetailItemId != null ? (
                                                <>{m.oldDetailItemName}（#{m.oldDetailItemId}）</>
                                            ) : (
                                                <span className="inline-block bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">全部細項</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="font-medium">{m.newIndicatorName}</div>
                                        <div className="text-gray-500 text-xs">
                                            {m.newDetailItemId != null ? (
                                                <>{m.newDetailItemName}（#{m.newDetailItemId}）</>
                                            ) : (
                                                <span className="inline-block bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">全部細項</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex justify-center gap-1">
                                            <RowActionButton icon={Pencil} label="編輯對照" tone="edit" onClick={() => setEditingMappingId(m.id)} />
                                            <RowActionButton icon={Trash2} label="刪除對照" tone="delete" onClick={() => deleteMapping(m.id)} />
                                        </div>
                                    </td>
                                </tr>
                            )
                        )}
                        {group.mappings.length === 0 && !addingMapping && (
                            <tr>
                                <td colSpan={3} className="px-3 py-6 text-center text-gray-400">
                                    這個計畫還沒有任何對照
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>

                {addingMapping ? (
                    <MappingForm
                        submitLabel="新增對照"
                        onCancel={() => setAddingMapping(false)}
                        onSubmit={addMapping}
                    />
                ) : (
                    <button
                        onClick={() => setAddingMapping(true)}
                        className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600"
                    >
                        <Plus className="w-4 h-4" /> 新增指標細項對照
                    </button>
                )}
            </div>
        </div>
    );
}

export default function DetailItemMappingView() {
    const [groups, setGroups] = React.useState<GroupDto[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [creatingGroup, setCreatingGroup] = React.useState(false);
    const [newName, setNewName] = React.useState('');
    const [newYear, setNewYear] = React.useState<number>(new Date().getFullYear() - 1911);
    const [newNote, setNewNote] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get<GroupDto[]>('/Admin/kpi/detail-item-mapping-groups', await authHeaders());
            setGroups(data);
        } catch {
            toast.error('讀取修訂計畫清單失敗');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const createGroup = async () => {
        if (!newName.trim()) {
            toast.error('請輸入修訂計畫名稱');
            return;
        }
        setSubmitting(true);
        try {
            await api.post(
                '/Admin/kpi/detail-item-mapping-groups',
                { name: newName.trim(), effectiveYear: newYear, note: newNote.trim() || null },
                await authHeaders()
            );
            toast.success('已建立修訂計畫，接下來可以在裡面新增指標對照');
            setNewName('');
            setNewNote('');
            setCreatingGroup(false);
            await load();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? '建立失敗');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white p-5 rounded-xl border shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">指標改名/換單位對照</h3>
                <p className="text-sm text-gray-500 mb-4">
                    每次政策調整（改名稱、換單位）先在這裡建立一個「修訂計畫」群組，再把這次一起變動的指標細項一筆一筆加進同一個計畫。
                    查詢畫面（指標詳情）會依對照把新舊指標的歷史資料合併顯示在一起，且各年度仍會顯示當年實際生效的名稱與單位。
                </p>

                {creatingGroup ? (
                    <div className="border rounded-lg p-4 bg-indigo-50/40">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input
                                className="border rounded px-3 py-2 text-sm md:col-span-1"
                                placeholder="計畫名稱，例如：113年空污指標函釋修訂"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                            <input
                                type="number"
                                className="border rounded px-3 py-2 text-sm"
                                placeholder="生效年度（民國年）"
                                value={newYear}
                                onChange={(e) => setNewYear(parseInt(e.target.value || '0', 10))}
                            />
                            <input
                                className="border rounded px-3 py-2 text-sm"
                                placeholder="備註（可留白）"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                            />
                        </div>
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={createGroup}
                                disabled={submitting}
                                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
                            >
                                建立計畫
                            </button>
                            <button onClick={() => setCreatingGroup(false)} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">
                                取消
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setCreatingGroup(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                    >
                        <Plus className="w-4 h-4" /> 建立修訂計畫
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {groups.map((g) => (
                    <GroupCard key={g.id} group={g} onChanged={load} />
                ))}
                {!loading && groups.length === 0 && (
                    <div className="bg-white p-10 rounded-xl border text-center text-gray-400">
                        尚無修訂計畫，點上面「建立修訂計畫」開始
                    </div>
                )}
            </div>
        </div>
    );
}
