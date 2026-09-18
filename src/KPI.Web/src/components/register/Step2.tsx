import React, {useEffect, useState} from "react";
import { useStepContext } from "../StepComponse";


// 用於全域暫存選擇的最底層組織節點，提供給外部呼叫
export const selectedOrgRef = { current: null as OrgNode | null };
export function getLatestSelectedOrganization(): OrgNode | null {
    return selectedOrgRef.current;
}
interface OrgNode {
    data: {
        id: number;
        name: string;
        typeId: number;
        typeName: string;
    };
    children: OrgNode[];
}


export default function Step2() {
    const { stepData, updateStepData } = useStepContext();
    // 紀錄每一層級的選擇結果（e.g. { 1: 企業節點, 2: 公司節點, 3: null }）
    const [selectedNodes, setSelectedNodes] = useState<{ [level: number]: OrgNode | null }>({});
    // 來自 Step1 設定的組織樹資料（陣列，可能有多個頂層組織）
    const organizationTrees = (stepData.organizationTree as OrgNode[]) || [];

    // domain 變動時重置選擇
    useEffect(() => {
        setSelectedNodes({});
    }, [organizationTrees]);

    const getNextLevelOptions = (node: OrgNode | null): OrgNode[] => {
        return node?.children || [];
    };
    // 給定某層節點，取得下一層子節點列表
    const handleSelectChange = (level: number, selectedId: number) => {
        const options = getOptionsForLevel(level);
        const selectedNode = options.find((n) => n.data.id === selectedId) || null;

        setSelectedNodes((prev) => {
            const updated = { ...prev };
            for (let l = level + 1; l <= 5; l++) {
                delete updated[l]; // 清空後續層級
            }
            updated[level] = selectedNode;
            return updated;
        });
    };
    // 給定某一層級，取得該層的選項
    const getOptionsForLevel = (level: number): OrgNode[] => {
        if (level === 1) return organizationTrees;
        const parent = selectedNodes[level - 1];
        return getNextLevelOptions(parent);
    };
    // 根據選擇情況，渲染各階層下拉選單
    const renderSelects = () => {
        const selects = [];
        for (let level = 1; level <= 3; level++) {
            const options = getOptionsForLevel(level);
            if (!options.length) break;

            const selected = selectedNodes[level];
            selects.push(
                <div key={level} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {`階層${level}`}{level > 1 ? '（可選）' : ''}
                    </label>
                    <select
                        className="w-full border rounded-md p-2 custom-outline-pink text-gray-800"
                        value={selected?.data.id || ''}
                        onChange={(e) => handleSelectChange(level, Number(e.target.value))}
                    >
                        <option value="">{`請選擇階層${level}`}{level > 1 ? '（可選）' : ''}</option>
                        {options.map((node) => (
                            <option key={node.data.id} value={node.data.id}>
                                {node.data.name}
                            </option>
                        ))}
                    </select>
                </div>
            );

            if (!selected) break; // 沒有選就不往下展開
        }
        return selects;
    };
    // 取得目前所有選擇中「最深」的那個節點（最後選的）
    const getDeepestSelectedNode = (): OrgNode | null => {
        const levels = Object.keys(selectedNodes).map(Number).sort((a, b) => a - b);

        for (let i = levels.length; i >= 1; i--) {
            const node = selectedNodes[i];
            if (node) return node;
        }

        return null;
    };
    // 每次選擇變動時，自動儲存最深層節點到 stepData（用於下一步）
    useEffect(() => {
        const deepest = getDeepestSelectedNode();
        selectedOrgRef.current = deepest;
        if (deepest) {
            updateStepData({
                userInfo: {
                    organizationId: deepest.data.id,
                    organizationName: deepest.data.name,
                    typeId: deepest.data.typeId,
                    typeName: deepest.data.typeName,
                },
            });
        }
    }, [selectedNodes]);

    return (
        <div className="card-body p-6">
            <div className="mb-4">
                <div>
                    <div className="sm:col-span-2">
                        {renderSelects()}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        請選擇您所屬的廠區
                    </p>
                    {(stepData as any).userInfoError && (
                        <div className="text-red-500 text-sm mt-2">
                            {(stepData as any).userInfoError}
                        </div>
                    )}
                </div>
                {/*<div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">*/}
                {/*    <fieldset>*/}
                {/*        <h2 className="text-sm/6 font-semibold text-gray-900">身分權限</h2>*/}
                {/*        <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-x-6">*/}
                {/*            <div className="flex items-center gap-x-3">*/}
                {/*                <input*/}
                {/*                    defaultChecked*/}
                {/*                    id="audit-admin"*/}
                {/*                    name="audit"*/}
                {/*                    type="radio"*/}
                {/*                    className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"*/}
                {/*                />*/}
                {/*                <label htmlFor="audit-admin"*/}
                {/*                       className="block text-sm/6 font-medium text-gray-900 whitespace-nowrap">*/}
                {/*                    員工*/}
                {/*                </label>*/}
                {/*            </div>*/}
                {/*            <div className="flex items-center gap-x-3">*/}
                {/*                <input*/}
                {/*                    id="audit-power"*/}
                {/*                    name="audit"*/}
                {/*                    type="radio"*/}
                {/*                    className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"*/}
                {/*                />*/}
                {/*                <label htmlFor="audit-power"*/}
                {/*                       className="block text-sm/6 font-medium text-gray-900 whitespace-nowrap">*/}
                {/*                    工廠主管*/}
                {/*                </label>*/}
                {/*            </div>*/}
                {/*            <div className="flex items-center gap-x-3">*/}
                {/*                <input*/}
                {/*                    id="audit-operator"*/}
                {/*                    name="audit"*/}
                {/*                    type="radio"*/}
                {/*                    className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"*/}
                {/*                />*/}
                {/*                <label htmlFor="audit-operator"*/}
                {/*                       className="block text-sm/6 font-medium text-gray-900 whitespace-nowrap">*/}
                {/*                    公司主管*/}
                {/*                </label>*/}
                {/*            </div>*/}
                {/*            <div className="flex items-center gap-x-3">*/}
                {/*                <input*/}
                {/*                    id="audit-none"*/}
                {/*                    name="audit"*/}
                {/*                    type="radio"*/}
                {/*                    className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"*/}
                {/*                />*/}
                {/*                <label htmlFor="audit-none"*/}
                {/*                       className="block text-sm/6 font-medium text-gray-900 whitespace-nowrap">*/}
                {/*                    政府監管者*/}
                {/*                </label>*/}
                {/*            </div>*/}
                {/*            <div className="flex items-center gap-x-3">*/}
                {/*                <input*/}
                {/*                    id="audit-none"*/}
                {/*                    name="audit"*/}
                {/*                    type="radio"*/}
                {/*                    className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"*/}
                {/*                />*/}
                {/*                <label htmlFor="audit-none"*/}
                {/*                       className="block text-sm/6 font-medium text-gray-900 whitespace-nowrap">*/}
                {/*                    審查委員*/}
                {/*                </label>*/}
                {/*            </div>*/}
                {/*        </div>*/}
                {/*    </fieldset>*/}
                {/*</div>*/}
            </div>
        </div>
    );
}