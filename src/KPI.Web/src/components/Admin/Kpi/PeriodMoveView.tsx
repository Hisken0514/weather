'use client';

import React, { useState } from 'react';
import api from '@/utils/api';
import { quarterHelper } from '@/helpers/quarter';

interface PreviewItem {
  organizationId: number;
  orgName: string;
  reportCount: number;
}

const PERIODS = ['Q2', 'Q4', 'H1', 'Y'];

export default function PeriodMoveView() {
  const [srcYear, setSrcYear] = useState('');
  const [srcPeriod, setSrcPeriod] = useState('Y');
  const [dstYear, setDstYear] = useState('');
  const [dstPeriod, setDstPeriod] = useState('Q2');

  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [previewing, setPreviewing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [result, setResult] = useState<{ count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    if (!srcYear || !srcPeriod) return;
    setPreviewing(true);
    setPreview(null);
    setResult(null);
    setError(null);
    try {
      const res = await api.get('/Admin/kpi/reports/move-period/preview', {
        params: { sourceYear: srcYear, sourcePeriod: srcPeriod },
      });
      const items: PreviewItem[] = res.data;
      setPreview(items);
      setSelected(new Set(items.map((i) => i.organizationId)));
    } catch (e: any) {
      setError(e?.response?.data?.message ?? '查詢失敗');
    } finally {
      setPreviewing(false);
    }
  };

  const handleMove = async () => {
    if (!preview || !dstYear || !dstPeriod) return;
    if (!confirm(`確定將 ${srcYear}${quarterHelper.getQuarterLabel(srcPeriod)} 的選取廠商資料搬移至 ${dstYear}${quarterHelper.getQuarterLabel(dstPeriod)}？\n此操作不可自動復原。`))
      return;
    setMoving(true);
    setError(null);
    try {
      const res = await api.post('/Admin/kpi/reports/move-period', {
        sourceYear: Number(srcYear),
        sourcePeriod: srcPeriod,
        targetYear: Number(dstYear),
        targetPeriod: dstPeriod,
        organizationIds: Array.from(selected),
      });
      setResult(res.data);
      setPreview(null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? '執行失敗');
    } finally {
      setMoving(false);
    }
  };

  const toggleAll = () => {
    if (!preview) return;
    if (selected.size === preview.length) setSelected(new Set());
    else setSelected(new Set(preview.map((i) => i.organizationId)));
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 max-w-3xl space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-1">填報期別修正</h3>
        <p className="text-sm text-gray-500">
          將廠商填錯期別的指標資料搬移到正確的年度與期別。若目標期別已有資料，該筆將自動跳過。
        </p>
      </div>

      {/* 來源 / 目標選擇 */}
      <div className="grid grid-cols-2 gap-6">
        <fieldset className="border rounded-lg p-4 space-y-3">
          <legend className="text-sm font-medium text-gray-600 px-1">來源期別（填錯的）</legend>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="年度（如 114）"
              value={srcYear}
              onChange={(e) => setSrcYear(e.target.value)}
              className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <select
              value={srcPeriod}
              onChange={(e) => setSrcPeriod(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {PERIODS.map((p) => <option key={p} value={p}>{quarterHelper.getQuarterLabel(p)}</option>)}
            </select>
          </div>
        </fieldset>

        <fieldset className="border rounded-lg p-4 space-y-3">
          <legend className="text-sm font-medium text-gray-600 px-1">目標期別（正確的）</legend>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="年度（如 115）"
              value={dstYear}
              onChange={(e) => setDstYear(e.target.value)}
              className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <select
              value={dstPeriod}
              onChange={(e) => setDstPeriod(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {PERIODS.map((p) => <option key={p} value={p}>{quarterHelper.getQuarterLabel(p)}</option>)}
            </select>
          </div>
        </fieldset>
      </div>

      <button
        onClick={handlePreview}
        disabled={previewing || !srcYear}
        className="btn btn-outline btn-sm"
      >
        {previewing ? '查詢中...' : '查詢受影響廠商'}
      </button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {result && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          搬移完成，共移動 <strong>{result.count}</strong> 筆報告。
        </div>
      )}

      {/* 預覽列表 */}
      {preview && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              共 <strong>{preview.length}</strong> 家廠商，已選取 <strong>{selected.size}</strong> 家
            </p>
            <button onClick={toggleAll} className="text-xs text-indigo-600 hover:underline">
              {selected.size === preview.length ? '全部取消' : '全選'}
            </button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === preview.length && preview.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-4 py-2 text-left">廠商名稱</th>
                  <th className="px-4 py-2 text-right">報告筆數</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((item) => (
                  <tr key={item.organizationId} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(item.organizationId)}
                        onChange={() => toggleOne(item.organizationId)}
                      />
                    </td>
                    <td className="px-4 py-2 text-gray-800">{item.orgName}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{item.reportCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleMove}
              disabled={moving || selected.size === 0 || !dstYear}
              className="btn btn-error btn-sm text-white"
            >
              {moving ? '執行中...' : `執行搬移（${selected.size} 家）`}
            </button>
            <span className="text-xs text-gray-400">
              搬移後年度 Period 欄位將更新，狀態保持不變
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
