"use client";

import {
    AlertCircle,
    Building2,
    ChevronDown,
    ChevronRight,
    Factory,
    Landmark,
    Network,
    RefreshCw,
    Search,
    Squirrel,
} from "lucide-react";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import api from "@/services/apiService";
import { toast } from "react-hot-toast";
import { getAccessToken } from "@/services/serverAuthService";

async function authHeaders() {
    const token = await getAccessToken();
    return {
        headers: {
            Authorization: token ? `Bearer ${token.value}` : "",
        },
    };
}

// ====== 型別定義 ======
export type OrgTreeNode = {
    id: number;
    name: string;
    typeCode: "enterprise" | "company" | "plant" | string;
    isActive: boolean;
    code?: string | null;
    address?: string | null;
    contactPerson?: string | null;
    contactPhone?: string | null;
    taxId?: string | null;
    children?: OrgTreeNode[];
};

export type OrganizationStructureProps = {
    fetchTreeAction?: () => Promise<OrgTreeNode[]>; // 若提供則用這個取代內建 API 讀取
    onNodeClickAction?: (node: OrgTreeNode) => void;
};

// ====== 工具：icon mapping ======
function TypeIcon({ type }: { type: string }) {
    if (type === "enterprise") return <Landmark className="h-4 w-4" />;
    if (type === "company") return <Building2 className="h-4 w-4" />;
    if (type === "plant") return <Factory className="h-4 w-4" />;
    return <Squirrel className="h-4 w-4" />;
}

// ====== 主元件 ======
export default function OrganizationStructure({
                                                  fetchTreeAction,
                                                  onNodeClickAction,
                                              }: OrganizationStructureProps) {
    // 資料
    const [tree, setTree] = useState<OrgTreeNode[]>([]);
    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const [selected, setSelected] = useState<OrgTreeNode | null>(null);

    // 篩選/搜尋
    const [q, setQ] = useState("");
    const [showInactive, setShowInactive] = useState(false);
    const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());

    // 拖放
    const dragRef = useRef<OrgTreeNode | null>(null);

    // 載入
    const load = useCallback(async () => {
        try {
            if (fetchTreeAction) {
                const data = await fetchTreeAction();
                setTree(data);
            } else {
                const { data } = await api.get<OrgTreeNode[]>(
                    "/Admin/org/tree",
                    await authHeaders()
                );
                setTree(data);
            }
        } catch (err) {
            console.error(err);
            toast.error("載入組織資料失敗");
        }
    }, [fetchTreeAction]);

    useEffect(() => {
        load();
    }, [load]);

    // 展開/收合
    const toggle = (id: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    };

    const expandAll = useCallback(() => {
        const allIds = new Set<number>();
        const walk = (nodes: OrgTreeNode[]) => {
            for (const n of nodes) {
                allIds.add(n.id);
                if (n.children?.length) walk(n.children);
            }
        };
        walk(tree);
        setExpanded(allIds);
    }, [tree]);

    const collapseAll = useCallback(() => setExpanded(new Set()), []);

    // 篩選 + 搜尋
    const visibleTree = useMemo(() => {
        const match = (n: OrgTreeNode): boolean => {
            const hitQ =
                q.trim().length === 0 ||
                `${n.name} ${n.code ?? ""}`.toLowerCase().includes(q.toLowerCase());
            const hitActive = showInactive || n.isActive;
            const hitType = typeFilter.size === 0 || typeFilter.has(n.typeCode);
            return hitQ && hitActive && hitType;
        };

        const filterRec = (nodes: OrgTreeNode[]): OrgTreeNode[] => {
            const res: OrgTreeNode[] = [];
            nodes.forEach((n) => {
                const kids = n.children ? filterRec(n.children) : [];
                if (match(n) || kids.length) res.push({ ...n, children: kids });
            });
            return res;
        };

        return filterRec(tree);
    }, [tree, q, showInactive, typeFilter]);

    // 麵包屑
    const path = useMemo(
        () => (selected ? findPath(tree, selected.id) : []),
        [tree, selected]
    );

    // 拖放驗證 + 呼叫 API
    const handleDrop = useCallback(
        async (drag: OrgTreeNode, dropTarget: OrgTreeNode) => {
            if (drag.id === dropTarget.id) return;
            const dragPath = findPath(tree, drag.id).map((n) => n.id);
            if (dragPath.includes(dropTarget.id)) {
                toast.error("不能移到自己的子節點下");
                return;
            }

            try {
                await api.patch(
                    `/Admin/org/${drag.id}/move`,
                    { newParentId: dropTarget.id },
                    await authHeaders()
                );
                toast.success(`已將「${drag.name}」移至「${dropTarget.name}」下`);
                await load();
            } catch (err) {
                console.error(err);
                toast.error("移動節點失敗");
            }
        },
        [tree, load]
    );

    return (
        <div className="w-full h-full flex flex-col gap-3">
            {/* 工具列 */}
            <div className="flex items-center justify-between rounded-2xl border p-3 bg-white shadow-sm">
                <div className="flex items-center gap-2">
                    <Network className="w-5 h-5" />
                    <div className="font-semibold">組織結構與階層</div>
                    <span className="text-xs text-gray-500">
            ({fetchTreeAction ? "Remote (custom)" : "Remote"})
          </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" /> 重新整理
                    </button>
                    <button
                        onClick={expandAll}
                        className="px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                    >
                        全部展開
                    </button>
                    <button
                        onClick={collapseAll}
                        className="px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                    >
                        全部收合
                    </button>
                </div>
            </div>

            {/* 主畫面 */}
            <div className="grid grid-cols-12 gap-4">
                {/* 左：樹狀 */}
                <div className="col-span-5">
                    <div className="rounded-2xl border p-3 bg-white shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="搜尋名稱/代碼..."
                                    className="w-full pl-9 pr-3 py-2 rounded-xl border focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl border">
                                <input
                                    type="checkbox"
                                    checked={showInactive}
                                    onChange={(e) => setShowInactive(e.target.checked)}
                                />
                                顯示停用
                            </label>
                        </div>
                    </div>

                    <div className="rounded-2xl border p-2 bg-white shadow-sm min-h-[480px] mt-2">
                        {visibleTree.length === 0 ? (
                            <div className="p-6 text-sm text-gray-500 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> 無符合的節點
                            </div>
                        ) : (
                            <TreeView
                                nodes={visibleTree}
                                expanded={expanded}
                                onToggle={toggle}
                                selectedId={selected?.id ?? null}
                                onSelect={(n) => {
                                    setSelected(n);
                                    onNodeClickAction?.(n);
                                }}
                                onDragStart={(n) => (dragRef.current = n)}
                                onDrop={(target) => {
                                    if (dragRef.current) {
                                        void handleDrop(dragRef.current, target);
                                        dragRef.current = null;
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* 右側詳情卡 */}
                <div className="col-span-7">
                    <div className="rounded-2xl border p-4 bg-white shadow-sm min-h-[280px]">
                        {!selected ? (
                            <div className="text-gray-500 text-sm">
                                請從左側樹狀選取節點以查看詳情。
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                    <TypeIcon type={selected.typeCode} />
                                    {selected.name}
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full border ${
                                            selected.isActive
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-gray-100 text-gray-600"
                                        }`}
                                    >
                    {selected.isActive ? "啟用" : "停用"}
                  </span>
                                </h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <InfoRow
                                        label="類型"
                                        value={translateType(selected.typeCode)}
                                    />
                                    <InfoRow label="代碼" value={selected.code ?? "-"} />
                                    <InfoRow label="地址" value={selected.address ?? "-"} />
                                    <InfoRow
                                        label="聯絡人"
                                        value={selected.contactPerson ?? "-"}
                                    />
                                    <InfoRow
                                        label="電話"
                                        value={selected.contactPhone ?? "-"}
                                    />
                                    <InfoRow label="統編" value={selected.taxId ?? "-"} />
                                </div>

                                {/* 麵包屑（可留用） */}
                                {path.length > 0 && (
                                    <div className="mt-3 text-xs text-gray-500 flex flex-wrap items-center gap-1">
                                        {path.map((p, i) => (
                                            <span key={p.id} className="flex items-center gap-1">
                        {i > 0 && (
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                        )}
                                                <button
                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border ${
                                                        selected?.id === p.id
                                                            ? "bg-indigo-50 border-indigo-200"
                                                            : "bg-white hover:bg-gray-50"
                                                    }`}
                                                    onClick={() => setSelected(p)}
                                                >
                          <TypeIcon type={p.typeCode} />
                          <span>{p.name}</span>
                        </button>
                      </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ====== 子元件：樹狀 ======
type TreeViewProps = {
    nodes: OrgTreeNode[];
    expanded: Set<number>;
    onToggle: (id: number) => void;
    selectedId: number | null;
    onSelect: (n: OrgTreeNode) => void;
    onDragStart?: (n: OrgTreeNode) => void;
    onDrop?: (n: OrgTreeNode) => void;
};

function TreeView({
                      nodes,
                      expanded,
                      onToggle,
                      selectedId,
                      onSelect,
                      onDragStart,
                      onDrop,
                  }: TreeViewProps) {
    return (
        <ul className="text-sm">
            {nodes.map((n) => (
                <TreeNode
                    key={n.id}
                    node={n}
                    expanded={expanded}
                    onToggle={onToggle}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onDragStart={onDragStart}
                    onDrop={onDrop}
                />
            ))}
        </ul>
    );
}

type TreeNodeProps = {
    node: OrgTreeNode;
    expanded: Set<number>;
    onToggle: (id: number) => void;
    selectedId: number | null;
    onSelect: (n: OrgTreeNode) => void;
    onDragStart?: (n: OrgTreeNode) => void;
    onDrop?: (n: OrgTreeNode) => void;
};

function TreeNode({
                      node,
                      expanded,
                      onToggle,
                      selectedId,
                      onSelect,
                      onDragStart,
                      onDrop,
                  }: TreeNodeProps) {
    const isOpen = expanded.has(node.id);
    const hasKids = (node.children?.length ?? 0) > 0;

    return (
        <li className="select-none">
            <div
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", String(node.id));
                    onDragStart?.(node);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    onDrop?.(node);
                }}
                onClick={() => onSelect(node)}
                className={`group flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-gray-50 ${
                    selectedId === node.id ? "bg-indigo-50 border border-indigo-200" : ""
                }`}
            >
                <button
                    onClick={(ev) => {
                        ev.stopPropagation();
                        if (hasKids) onToggle(node.id);
                    }}
                    className={`h-5 w-5 inline-flex items-center justify-center rounded-md ${
                        hasKids ? "hover:bg-gray-100" : "opacity-0"
                    }`}
                    title={hasKids ? (isOpen ? "收合" : "展開") : ""}
                >
                    {hasKids ? (
                        isOpen ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                        )
                    ) : (
                        <span className="w-4 h-4" />
                    )}
                </button>
                <TypeIcon type={node.typeCode} />
                <span className="font-medium">{node.name}</span>
                {!node.isActive && (
                    <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        停用
                    </span>
                )}
                {node.code && (
                    <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded border text-gray-500">
                        {node.code}
                    </span>
                )}
            </div>
            {hasKids && isOpen && (
                <ul className="ml-6">
                    {node.children!.map((c) => (
                        <TreeNode
                            key={c.id}
                            node={c}
                            expanded={expanded}
                            onToggle={onToggle}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            onDragStart={onDragStart}
                            onDrop={onDrop}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

// ====== 小元件 ======
function InfoRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="grid grid-cols-3 items-start">
            <div className="text-gray-500">{label}</div>
            <div className="col-span-2 break-all">{value ?? "-"}</div>
        </div>
    );
}

function translateType(typeCode: string) {
    if (typeCode === "enterprise") return "企業";
    if (typeCode === "company") return "公司";
    if (typeCode === "plant") return "工廠";
    return typeCode;
}

// ====== 工具：尋路 ======
function findPath(nodes: OrgTreeNode[], targetId: number): OrgTreeNode[] {
    for (const n of nodes) {
        if (n.id === targetId) return [n];
        if (n.children && n.children.length) {
            const sub = findPath(n.children, targetId);
            if (sub.length) return [n, ...sub];
        }
    }
    return [];
}
