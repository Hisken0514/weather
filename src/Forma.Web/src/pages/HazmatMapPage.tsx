import { useState, useMemo, useEffect, useRef } from 'react';
import { RISK_COLOR, RISK_LABEL, RISK_LEVELS_ORDER, TAIWAN_COUNTIES, type Factory, type RiskLevel } from '@/components/hazmat-map/hazmatTypes';
import TaiwanMap from '@/components/hazmat-map/TaiwanMap';
import { MainLayout } from '@/components/layout/MainLayout';
import { supervisionApi } from '@/lib/api/supervision';
import { riskScoringApi } from '@/lib/api/riskScoring';
import { factoryRiskApi } from '@/lib/api/factoryRisk';
import { FactoryTrendPanel } from '@/components/hazmat-map/FactoryTrendPanel';
import type { CampaignMapFactoryDto } from '@/types/api/supervision';
import type { SchemeListItem } from '@/types/api/riskScoring';

const RISK_LEVELS: RiskLevel[] = RISK_LEVELS_ORDER;

function normalizeCounty(name: string) {
  return name.replace(/臺/g, '台');
}

const RISK_STYLE: Record<RiskLevel, { border: string; bg: string; activeBg: string; text: string }> = {
  high:      { border: 'border-red-400',    bg: 'bg-red-50',    activeBg: 'bg-red-500',    text: 'text-red-600' },
  medium:    { border: 'border-orange-400', bg: 'bg-orange-50', activeBg: 'bg-orange-500', text: 'text-orange-600' },
  mediumLow: { border: 'border-amber-400',  bg: 'bg-amber-50',  activeBg: 'bg-amber-500',  text: 'text-amber-600' },
  low:       { border: 'border-green-400',  bg: 'bg-green-50',  activeBg: 'bg-green-500',  text: 'text-green-600' },
};

interface CountyGroup {
  county: string;
  total: number;
  breakdown: Partial<Record<RiskLevel, number>>;
}

// 拉桿拖曳中只更新自己的本地 draft（便宜），放開／打字結束才呼叫 onCommit 通知外層——
// 外層一改 thresholds 就會重算整份工廠清單並整包傳給 <TaiwanMap>，拖曳中每個 tick 都觸發會很卡。
function ThresholdSlider({
                            label, color, value, min, max, onCommit,
                          }: {
  label: string; color: string; value: number; min: number; max: number; onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState(value);

  // 外部值變了（例如切換資料年度重設門檻）才同步 draft，不要蓋掉使用者正在拖/打的值
  useEffect(() => { setDraft(value); }, [value]);

  function commit(raw: number) {
    if (Number.isNaN(raw)) { setDraft(value); return; }
    const clamped = Math.min(max, Math.max(min, Math.round(raw)));
    setDraft(clamped);
    onCommit(clamped);
  }

  return (
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className={`font-semibold ${color}`}>{label} ≥</span>
          <div className="flex items-center gap-1">
            <input
                type="number"
                value={draft}
                min={min}
                max={max}
                onChange={e => setDraft(e.target.value === '' ? min : +e.target.value)}
                onBlur={() => commit(draft)}
                onKeyDown={e => { if (e.key === 'Enter') { commit(draft); (e.target as HTMLInputElement).blur(); } }}
                className="w-16 text-right font-bold text-gray-700 border border-gray-300 rounded px-1 py-0.5 text-sm"
            />
            <span className="text-sm text-gray-500">分</span>
          </div>
        </div>
        <input
            type="range" min={min} max={max} value={draft}
            onChange={e => setDraft(+e.target.value)}
            onMouseUp={e => commit(+(e.target as HTMLInputElement).value)}
            onTouchEnd={e => commit(+(e.target as HTMLInputElement).value)}
            onKeyUp={e => commit(+(e.target as HTMLInputElement).value)}
            className="w-full accent-blue-600"
        />
      </div>
  );
}

// 分級一律採用原始風險分數（hazardSeverityScore × managementRiskScore），不用後端依排名正規化過的 0–100 分數。
function rawScoreOf(dto: CampaignMapFactoryDto): number {
  return dto.rawRiskScore ?? dto.riskScore;
}

function toFactory(
    dto: CampaignMapFactoryDto,
    idx: number,
    thresholds: { high: number; medium: number; mediumLow: number },
    prevScoreMap?: Map<string, number>,
): Factory {
  const score = rawScoreOf(dto);
  const riskLevel: RiskLevel = score >= thresholds.high ? 'high'
      : score >= thresholds.medium ? 'medium'
          : score >= thresholds.mediumLow ? 'mediumLow'
              : 'low';
  const prevRiskScore = prevScoreMap?.get(dto.supervisedFactoryId);
  return {
    id: idx + 1,
    name: dto.factoryName,
    county: dto.county ?? '未知縣市',
    industrialPark: dto.industrialPark ?? undefined,
    lat: dto.lat ?? undefined,
    lng: dto.lng ?? undefined,
    riskScore: score,
    riskLevel,
    chemicals: [],
    supervisedFactoryId: dto.supervisedFactoryId,
    prevRiskScore,
    riskIncreased: prevRiskScore != null ? score > prevRiskScore : undefined,
    riskDecreased: prevRiskScore != null ? score < prevRiskScore : undefined,
  };
}

export function HazmatMapPage() {
  const [selectedCounty, setSelectedCounty] = useState<string>('全部');
  const [selectedFactory, setSelectedFactory] = useState<Factory | null>(null);
  const [showTrendPanel, setShowTrendPanel] = useState(false);
  const [labeledRisks, setLabeledRisks] = useState<Set<RiskLevel>>(new Set());
  const [zoomRequest, setZoomRequest] = useState<{ county: string | null; park?: string | null; gen: number }>({ county: null, gen: 0 });
  const [thresholds, setThresholds] = useState({ high: 75, medium: 50, mediumLow: 25 });
  const [schemes, setSchemes] = useState<SchemeListItem[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedDataYear, setSelectedDataYear] = useState<number | undefined>(undefined);
  const [campaignDtos, setCampaignDtos] = useState<CampaignMapFactoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPark, setSelectedPark] = useState<string>('全部');
  const [prevYearDtos, setPrevYearDtos] = useState<CampaignMapFactoryDto[]>([]);
  const [prevYearAvailable, setPrevYearAvailable] = useState(true);
  const [showRiskUpOnly, setShowRiskUpOnly] = useState(false);
  const [showRiskDownOnly, setShowRiskDownOnly] = useState(false);
  const [factoryListOpen, setFactoryListOpen] = useState(true);
  const [factorySearch, setFactorySearch] = useState('');

  useEffect(() => {
    riskScoringApi.getSchemes().then(list => {
      setSchemes(list);
      setSelectedSchemeId(list.find(s => s.isActive)?.id ?? list[0]?.id ?? '');
    }).catch(() => {});
    factoryRiskApi.getAvailableDataYears().then(setAvailableYears).catch(() => {});
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setSelectedFactory(null);
    setShowTrendPanel(false);
    setSelectedCounty('全部');
    setSelectedPark('全部');
    // 資料整批換掉了，地圖內部記著的縮放/聚焦縣市也要一併重置，
    // 不然畫面還停在舊縣市的縮放位置，新資料的座標點都在畫面外，看起來就像圖示整個不見了。
    setZoomRequest(prev => ({ county: null, park: null, gen: prev.gen + 1 }));
    supervisionApi.getAllRiskMapFactories(selectedDataYear, selectedSchemeId || undefined)
        .then(dtos => {
          if (ignore) return; // 這次請求已經過期（切換得比回應還快），不要用舊資料蓋掉新的
          setCampaignDtos(dtos);
          // 換了資料年度／年度標準，原始分數尺度可能不同，把分級門檻重設為新分數範圍的 75%／50%／25%
          const scores = dtos.map(rawScoreOf);
          const max = scores.length > 0 ? Math.max(...scores) : 0;
          const scoreMax = Math.max(10, Math.ceil((max || 10) / 5) * 5);
          setThresholds({
            high: Math.round(scoreMax * 0.75),
            medium: Math.round(scoreMax * 0.5),
            mediumLow: Math.round(scoreMax * 0.25),
          });
        })
        .catch(() => { if (!ignore) setCampaignDtos([]); })
        .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [selectedSchemeId, selectedDataYear]);

  // 去年風險比較：去年套用去年自己的年度標準（例如 114 套用 114 標準、115 套用 115 標準）
  useEffect(() => {
    let ignore = false;
    const currentYear = selectedDataYear ?? availableYears[0];
    const prevYear = currentYear != null ? currentYear - 1 : undefined;
    const prevScheme = prevYear != null ? schemes.find(s => s.year === prevYear) : undefined;
    if (currentYear == null || prevYear == null || !prevScheme) {
      setPrevYearDtos([]);
      setPrevYearAvailable(false);
      return;
    }
    setPrevYearAvailable(true);
    supervisionApi.getAllRiskMapFactories(prevYear, prevScheme.id)
        .then(dtos => { if (!ignore) setPrevYearDtos(dtos); })
        .catch(() => { if (!ignore) setPrevYearDtos([]); });
    return () => { ignore = true; };
  }, [selectedDataYear, availableYears, schemes]);

  const prevScoreMap = useMemo(() =>
          new Map(prevYearDtos.map(d => [d.supervisedFactoryId, rawScoreOf(d)])),
      [prevYearDtos]);

  // 依目前載入資料的原始分數範圍，動態決定分級拉條的上限（不同標準的原始分數尺度可能不同，不能寫死 0–100）
  const rawScoreMax = useMemo(() => {
    const scores = campaignDtos.map(rawScoreOf);
    const max = scores.length > 0 ? Math.max(...scores) : 0;
    return Math.max(10, Math.ceil((max || 10) / 5) * 5, thresholds.high);
  }, [campaignDtos, thresholds.high]);

  const availableParks = useMemo(() => {
    if (!campaignDtos) return [];
    const source = selectedCounty === '全部'
        ? campaignDtos
        : campaignDtos.filter(d => (d.county ?? '未知縣市') === selectedCounty);
    return Array.from(new Set(
        source.map(d => d.industrialPark).filter((p): p is string => !!p)
    )).sort();
  }, [campaignDtos, selectedCounty]);

  const sourceFactories: Factory[] = useMemo(() => {
    const all = campaignDtos.map((dto, i) => toFactory(dto, i, thresholds, prevScoreMap));
    const byPark = selectedPark === '全部'
        ? all
        : all.filter(f => f.industrialPark === selectedPark);
    if (showRiskUpOnly) return byPark.filter(f => f.riskIncreased);
    if (showRiskDownOnly) return byPark.filter(f => f.riskDecreased);
    return byPark;
  }, [campaignDtos, thresholds, selectedPark, prevScoreMap, showRiskUpOnly, showRiskDownOnly]);

  const riskUpCount = useMemo(() =>
          campaignDtos.reduce((s, dto, i) => s + (toFactory(dto, i, thresholds, prevScoreMap).riskIncreased ? 1 : 0), 0),
      [campaignDtos, thresholds, prevScoreMap]);

  const riskDownCount = useMemo(() =>
          campaignDtos.reduce((s, dto, i) => s + (toFactory(dto, i, thresholds, prevScoreMap).riskDecreased ? 1 : 0), 0),
      [campaignDtos, thresholds, prevScoreMap]);

  const noCoordCount = useMemo(() =>
          campaignDtos.filter(d => d.lat == null || d.lng == null).length,
      [campaignDtos]);

  const counties = useMemo(() => {
    const fromFactories = new Set(sourceFactories.map(f => f.county));
    if (selectedCounty !== '全部') fromFactories.add(selectedCounty);
    return ['全部', ...[...fromFactories].sort()];
  }, [sourceFactories, selectedCounty]);

  const filtered = useMemo(() =>
          selectedCounty === '全部'
              ? sourceFactories
              : sourceFactories.filter(f => f.county === selectedCounty),
      [selectedCounty, sourceFactories]);

  // 工廠清單：依關鍵字搜尋工廠名稱，並依風險分數由高到低排序
  const searchedSortedFactories = useMemo(() => {
    const kw = factorySearch.trim();
    const base = kw ? filtered.filter(f => f.name.includes(kw)) : filtered;
    return [...base].sort((a, b) => b.riskScore - a.riskScore);
  }, [filtered, factorySearch]);

  const counts: Record<RiskLevel, number> = useMemo(() => ({
    high:      filtered.filter(f => f.riskLevel === 'high').length,
    medium:    filtered.filter(f => f.riskLevel === 'medium').length,
    mediumLow: filtered.filter(f => f.riskLevel === 'mediumLow').length,
    low:       filtered.filter(f => f.riskLevel === 'low').length,
  }), [filtered]);

  const showCountyGroups = selectedCounty === '全部';

  const countyGroups: CountyGroup[] = useMemo(() => {
    if (!showCountyGroups) return [];
    const source = labeledRisks.size > 0
        ? filtered.filter(f => labeledRisks.has(f.riskLevel))
        : filtered;
    const map = new Map<string, Factory[]>();
    for (const f of source) {
      if (!map.has(f.county)) map.set(f.county, []);
      map.get(f.county)!.push(f);
    }
    const allCounties = new Set([...TAIWAN_COUNTIES, ...map.keys()]);
    return Array.from(allCounties)
        .map(county => {
          const facs = map.get(county) ?? [];
          return {
            county,
            total: facs.length,
            breakdown: {
              high:      facs.filter(f => f.riskLevel === 'high').length      || undefined,
              medium:    facs.filter(f => f.riskLevel === 'medium').length    || undefined,
              mediumLow: facs.filter(f => f.riskLevel === 'mediumLow').length || undefined,
              low:       facs.filter(f => f.riskLevel === 'low').length       || undefined,
            },
          };
        })
        .sort((a, b) => b.total - a.total);
  }, [showCountyGroups, filtered, labeledRisks]);


  function handleCountyFocus(geoName: string | null) {
    setSelectedFactory(null);
    setShowTrendPanel(false);
    setSelectedPark('全部');
    setFactorySearch('');
    if (!geoName) { setSelectedCounty('全部'); return; }
    setSelectedCounty(normalizeCounty(geoName));
  }

  function handleCountyChange(county: string) {
    setSelectedCounty(county);
    setSelectedPark('全部');
    setSelectedFactory(null);
    setShowTrendPanel(false);
    setFactorySearch('');
    setZoomRequest(prev => ({ county: county === '全部' ? null : county, gen: prev.gen + 1 }));
  }

  function handleCountyGroupClick(county: string) {
    setSelectedCounty(county);
    setSelectedFactory(null);
    setShowTrendPanel(false);
    setFactorySearch('');
    setZoomRequest(prev => ({ county, gen: prev.gen + 1 }));
  }

  // 選產業園區時跟縣市篩選一樣直接把地圖拉過去：先找出這個園區屬於哪個縣市（可能還沒選定縣市），
  // 讓地圖先縮放到該縣市，縣市對上了 TaiwanMap 內部才會再往內縮放到園區本身。
  function handleParkSelect(parkName: string) {
    setSelectedFactory(null);
    setShowTrendPanel(false);
    setSelectedPark(parkName);
    if (parkName === '全部') return;
    const county = campaignDtos.find(d => d.industrialPark === parkName)?.county ?? selectedCounty;
    if (!county || county === '全部') return;
    if (county !== selectedCounty) setSelectedCounty(county);
    setZoomRequest(prev => ({ county, park: parkName, gen: prev.gen + 1 }));
  }

  // 選取工廠時同步開啟 trend panel（若工廠有 supervisedFactoryId）
  function handleSelectFactory(factory: Factory | null) {
    setSelectedFactory(factory);
    setShowTrendPanel(!!(factory?.supervisedFactoryId));
  }

  const [labeledFactoryIds, setLabeledFactoryIds] = useState<Set<number>>(new Set());

  // 這不是跟外部系統同步，是「依賴變了就重置」的一般 state，改用官方文件建議的
  // render 期間比較上次依賴 + 直接呼叫 setState，省掉 Effect 版本多出來的那一次 commit/重繪。
  const labeledFactoryDepsRef = useRef<{ county: string; risks: Set<RiskLevel>; list: Factory[] } | null>(null);
  {
    const prevDeps = labeledFactoryDepsRef.current;

    if (!prevDeps || prevDeps.county !== selectedCounty || prevDeps.risks !== labeledRisks || prevDeps.list !== filtered) {
      labeledFactoryDepsRef.current = { county: selectedCounty, risks: labeledRisks, list: filtered };
      const next = selectedCounty === '全部' || labeledRisks.size === 0
          ? new Set<number>()
          : new Set(filtered.filter(f => labeledRisks.has(f.riskLevel)).slice(0, 10).map(f => f.id));
      setLabeledFactoryIds(next);
    }
  }

  function toggleLabeledFactory(id: number) {
    setLabeledFactoryIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleRisk(level: RiskLevel) {
    setLabeledRisks(prev => {
      const next = new Set(prev);
      next.has(level) ? next.delete(level) : next.add(level);
      return next;
    });
  }

  return (
      <MainLayout title="危險品風險分級地圖">
        <div className="flex overflow-hidden" style={{ margin: '-24px', height: 'calc(100vh - 64px)' }}>

          {/* Sidebar */}
          <div className="w-72 bg-white shadow-md flex flex-col overflow-hidden shrink-0">

            <button
                className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors shrink-0"
            >
              <span>篩選條件</span>
            </button>
            {loading && (
                <div className="px-4 py-2 text-xs text-blue-500">載入工廠資料中…</div>
            )}
    

              {availableYears.length > 0 && (
                  <div className="p-4 border-b shrink-0">
                    <label className="block text-xs font-medium text-gray-600 mb-1">資料年度</label>
                    <select
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        value={selectedDataYear ?? ''}
                        onChange={e => setSelectedDataYear(e.target.value ? Number(e.target.value) : undefined)}
                    >
                      {availableYears.map(y => (
                          <option key={y} value={y}>{y} 年</option>
                      ))}
                    </select>
                  </div>
              )}

              {schemes.length > 0 && (
                  <div className="p-4 border-b shrink-0">
                    <label className="block text-xs font-medium text-gray-600 mb-1">年度標準</label>
                    <select
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        value={selectedSchemeId}
                        onChange={e => setSelectedSchemeId(e.target.value)}
                    >
                      {schemes.map(scheme => (
                          <option key={scheme.id} value={scheme.id}>
                            {scheme.name || `${scheme.year} 年`}
                          </option>
                      ))}
                    </select>
                  </div>
              )}

              <div className="p-4 border-b shrink-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">縣市篩選</label>
                <select
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    value={selectedCounty}
                    onChange={e => handleCountyChange(e.target.value)}
                >
                  {counties.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {availableParks.length > 0 && (
                  <div className="p-4 border-b shrink-0">
                    <label className="block text-sm font-medium text-gray-700 mb-1">產業園區</label>
                    <select
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        value={selectedPark}
                        onChange={e => handleParkSelect(e.target.value)}
                    >
                      <option value="全部">全部（{availableParks.reduce((s, p) => s + campaignDtos.filter(d => d.industrialPark === p && (selectedCounty === '全部' || (d.county ?? '未知縣市') === selectedCounty)).length, 0)} 家）</option>
                      {availableParks.map(p => {
                        const count = campaignDtos.filter(d => d.industrialPark === p && (selectedCounty === '全部' || (d.county ?? '未知縣市') === selectedCounty)).length;
                        return <option key={p} value={p}>{p}（{count} 家）</option>;
                      })}
                    </select>
                  </div>
              )}

              <div className="p-4 border-b shrink-0">
                <div className="text-base font-semibold text-gray-700 mb-3">風險排名分級</div>
                {([
                  { label: '高風險',   key: 'high' as const,      color: 'text-red-600',    min: thresholds.medium + 1,    max: rawScoreMax },
                  { label: '中風險',   key: 'medium' as const,    color: 'text-orange-600', min: thresholds.mediumLow + 1, max: thresholds.high - 1 },
                  { label: '中低風險', key: 'mediumLow' as const, color: 'text-amber-600',  min: 1,                        max: thresholds.medium - 1 },
                ]).map(({ label, key, color, min, max }) => (
                    <ThresholdSlider
                        key={key}
                        label={label}
                        color={color}
                        value={thresholds[key]}
                        min={min}
                        max={max}
                        onCommit={v => setThresholds(prev => ({ ...prev, [key]: v }))}
                    />
                ))}
              </div>

              {/* 風險上升／下降篩選（與去年同期比較，各自套用當年度標準） */}
              <div className="p-4 border-b shrink-0 grid grid-cols-2 gap-2">
                <button
                    onClick={() => prevYearAvailable && setShowRiskUpOnly(v => { const next = !v; if (next) setShowRiskDownOnly(false); return next; })}
                    disabled={!prevYearAvailable}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-2 py-2 text-sm leading-snug transition-colors ${
                        !prevYearAvailable
                            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                            : showRiskUpOnly
                                ? 'border-red-500 bg-red-500 text-white'
                                : 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                    title={prevYearAvailable ? '較去年風險值上升的工廠（去年套用去年年度標準計算）' : '無去年對應年度標準，無法比較'}
                >
                  <span className="break-words text-center">⚠ 較去年上升</span>
                  <span className="font-bold">{prevYearAvailable ? riskUpCount : '—'} 家</span>
                </button>
                <button
                    onClick={() => prevYearAvailable && setShowRiskDownOnly(v => { const next = !v; if (next) setShowRiskUpOnly(false); return next; })}
                    disabled={!prevYearAvailable}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-2 py-2 text-sm leading-snug transition-colors ${
                        !prevYearAvailable
                            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                            : showRiskDownOnly
                                ? 'border-green-500 bg-green-500 text-white'
                                : 'border-green-300 bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                    title={prevYearAvailable ? '較去年風險值下降的工廠（去年套用去年年度標準計算）' : '無去年對應年度標準，無法比較'}
                >
                  <span className="break-words text-center">▽ 較去年下降</span>
                  <span className="font-bold">{prevYearAvailable ? riskDownCount : '—'} 家</span>
                </button>
              </div>

              <div className="p-4 border-b shrink-0">
                <div className="text-sm font-medium text-gray-700 mb-2">快速篩選（顯示地圖標籤）</div>
                <div className="grid grid-cols-4 gap-2">
                  {RISK_LEVELS.map(level => {
                    const s = RISK_STYLE[level];
                    const active = labeledRisks.has(level);
                    return (
                        <button
                            key={level}
                            onClick={() => toggleRisk(level)}
                            className={`rounded-lg border-2 py-2 transition-all text-center ${s.border} ${active ? `${s.activeBg} text-white` : `${s.bg} ${s.text}`}`}
                        >
                          <div className={`font-bold text-lg leading-none ${active ? 'text-white' : ''}`}>
                            {counts[level]}
                          </div>
                          <div className={`text-xs mt-0.5 ${active ? 'text-white' : ''}`}>
                            {RISK_LABEL[level]}
                          </div>
                        </button>
                    );
                  })}
                </div>
                {labeledRisks.size > 0 && (
                    <button
                        onClick={() => setLabeledRisks(new Set())}
                        className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      清除篩選
                    </button>
                )}
              </div>

              {/* 已選工廠詳情 */}
              {selectedFactory && (
                  <div className="p-4 border-b bg-blue-50 shrink-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-800 mb-0.5">{selectedFactory.name}</div>
                        <div className="text-xs text-gray-500 mb-2">{selectedFactory.county}</div>
                      </div>
                      <span
                          className="text-xs px-2 py-0.5 rounded-full text-white shrink-0"
                          style={{ backgroundColor: RISK_COLOR[selectedFactory.riskLevel] }}
                      >
                    {RISK_LABEL[selectedFactory.riskLevel]}
                  </span>
                    </div>
                    {selectedFactory.industrialPark && (
                        <div className="text-xs text-gray-600 mb-1">
                          <span className="font-medium">產業園區：</span>{selectedFactory.industrialPark}
                        </div>
                    )}
                    <div className="text-xs text-gray-600 mb-1">
                      <span className="font-medium">風險分數：</span>{selectedFactory.riskScore} 分
                      {selectedFactory.riskIncreased && (
                          <span className="ml-1 text-red-600 font-semibold">
                        ⚠ 較去年（{selectedFactory.prevRiskScore} 分）上升
                      </span>
                      )}
                    </div>
                    {selectedFactory.chemicals && selectedFactory.chemicals.length > 0 && (
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">危險化學品：</span>{selectedFactory.chemicals.join('、')}
                        </div>
                    )}
                    {selectedFactory.lat == null && (
                        <div className="mt-1 text-xs text-amber-600">此工廠無座標資料</div>
                    )}
                    {/* 走勢面板快速開關（補充入口） */}
                    {selectedFactory.supervisedFactoryId && (
                        <button
                            onClick={() => setShowTrendPanel(v => !v)}
                            className="mt-2 w-full text-xs text-blue-600 hover:text-blue-800 transition-colors text-left"
                        >
                          {showTrendPanel ? '▼ 隱藏跨年度走勢' : '▲ 查看跨年度走勢'}
                        </button>
                    )}
                  </div>
              )}
          </div>

          <div className="flex-1 relative overflow-hidden flex">
            {/* 無座標提示：浮在地圖左下角，不擠佔側邊欄篩選器的空間 */}
            {!loading && noCoordCount > 0 && (
                <div className="absolute bottom-4 left-4 z-20 max-w-xs rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 shadow-md">
                  {noCoordCount} 家工廠無座標，不顯示於地圖
                </div>
            )}

            {/* 篩選後的工廠清單：只在已縮放到單一縣市時顯示浮動面板（貼近「返回全台」按鈕下方）；
                「全部」總覽畫面地圖本身已經有縣市統計方塊，不需要重複，也才不會互相重疊 */}
            {!showCountyGroups && (
            <div className="absolute top-24 left-3 z-20 w-72 rounded-lg bg-white shadow-lg overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100% - 7rem)' }}>
              <button
                  className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors shrink-0"
                  onClick={() => setFactoryListOpen(v => !v)}
              >
                <span>工廠清單</span>
                <span>{factoryListOpen ? '▲' : '▼'}</span>
              </button>
              {factoryListOpen && !showCountyGroups && (
                <div className="px-3 py-2 border-b shrink-0">
                  <input
                      type="text"
                      value={factorySearch}
                      onChange={e => setFactorySearch(e.target.value)}
                      placeholder="搜尋工廠名稱…"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  />
                </div>
              )}
              {factoryListOpen && (
              <div className="overflow-y-auto">
              {showCountyGroups ? (
                  <>
                    <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50 border-b sticky top-0">
                      {labeledRisks.size > 0 ? '篩選後' : '全台'}共{' '}
                      <span className="font-medium text-gray-600">
                    {countyGroups.reduce((s, g) => s + g.total, 0)}
                  </span>{' '}
                      家・點擊縣市查看詳情
                    </div>
                    {countyGroups.map(({ county, total, breakdown }) => (
                        <div
                            key={county}
                            className={`px-4 py-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${selectedCounty === county ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                            onClick={() => handleCountyGroupClick(county)}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-sm text-gray-800">{county}</span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {total} 家
                      </span>
                          </div>
                          <div className="flex gap-1">
                            {RISK_LEVELS.filter(l => labeledRisks.has(l) && breakdown[l]).map(l => (
                                <span
                                    key={l}
                                    className="text-xs px-1.5 py-0.5 rounded text-white"
                                    style={{ backgroundColor: RISK_COLOR[l] }}
                                >
                          {RISK_LABEL[l]} {breakdown[l]}
                        </span>
                            ))}
                          </div>
                        </div>
                    ))}
                  </>
              ) : labeledRisks.size > 0 ? (
                  (() => {
                    const matched = searchedSortedFactories.filter(f => labeledRisks.has(f.riskLevel));
                    const labeledList   = matched.filter(f =>  labeledFactoryIds.has(f.id));
                    const unlabeledList = matched.filter(f => !labeledFactoryIds.has(f.id));
                    const row = (factory: Factory, inLabel: boolean) => (
                        <div
                            key={factory.id}
                            title={factory.riskIncreased ? `較去年（${factory.prevRiskScore} 分）上升` : undefined}
                            className={`px-3 py-2.5 border-b hover:bg-gray-50 transition-colors ${
                                selectedFactory?.id === factory.id
                                    ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                    : factory.riskIncreased ? 'bg-red-50 border-l-4 border-l-red-500' : ''
                            }`}
                        >
                          <div className="flex items-center gap-1.5">
                      <span
                          className="font-medium text-sm text-gray-800 truncate flex-1 cursor-pointer"
                          onClick={() => handleSelectFactory(factory)}
                      >
                        {factory.riskIncreased && '⚠ '}{factory.name}
                      </span>
                            <span
                                className="text-xs px-1.5 py-0.5 rounded-full text-white shrink-0"
                                style={{ backgroundColor: RISK_COLOR[factory.riskLevel] }}
                            >
                        {RISK_LABEL[factory.riskLevel]}
                      </span>
                            <button
                                onClick={e => { e.stopPropagation(); toggleLabeledFactory(factory.id); }}
                                className={`shrink-0 w-5 h-5 rounded-full text-xs flex items-center justify-center transition-colors ${
                                    inLabel
                                        ? 'bg-red-100 text-red-500 hover:bg-red-200'
                                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                                }`}
                                title={inLabel ? '移除標籤' : '加入標籤'}
                            >
                              {inLabel ? '✕' : '+'}
                            </button>
                          </div>
                        </div>
                    );
                    return (
                        <>
                          <div className="px-4 py-1.5 text-xs text-gray-400 bg-gray-50 border-b sticky top-0 flex items-center gap-1">
                            標籤顯示中
                            <span className="font-medium text-gray-600">{labeledList.length}</span>
                            <span className="ml-auto text-gray-300">點 ✕ 移除</span>
                          </div>
                          {labeledList.length === 0
                              ? <div className="px-4 py-3 text-xs text-gray-400">尚未加入任何標籤</div>
                              : labeledList.map(f => row(f, true))
                          }
                          <div className="px-4 py-1.5 text-xs text-gray-400 bg-gray-50 border-b border-t sticky top-7 flex items-center gap-1">
                            其他工廠
                            <span className="font-medium text-gray-600">{unlabeledList.length}</span>
                            <span className="ml-auto text-gray-300">點 + 加入標籤</span>
                          </div>
                          {unlabeledList.map(f => row(f, false))}
                        </>
                    );
                  })()
              ) : searchedSortedFactories.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-400">
                    <div className="text-2xl mb-2">🗺️</div>
                    {factorySearch.trim() ? '找不到符合關鍵字的工廠' : '此縣市目前無工廠資料'}
                  </div>
              ) : (
                  searchedSortedFactories.map(factory => (
                      <div
                          key={factory.id}
                          title={factory.riskIncreased ? `較去年（${factory.prevRiskScore} 分）上升` : undefined}
                          className={`px-4 py-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                              selectedFactory?.id === factory.id
                                  ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                  : factory.riskIncreased ? 'bg-red-50 border-l-4 border-l-red-500' : ''
                          }`}
                          onClick={() => handleSelectFactory(factory)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-gray-800 truncate mr-2">
                            {factory.riskIncreased && '⚠ '}{factory.name}
                          </span>
                          <span
                              className="text-xs px-2 py-0.5 rounded-full text-white shrink-0"
                              style={{ backgroundColor: RISK_COLOR[factory.riskLevel] }}
                          >
                      {RISK_LABEL[factory.riskLevel]}
                    </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{factory.county}</div>
                      </div>
                  ))
              )}
              </div>
              )}
            </div>
            )}

            <TaiwanMap
                factories={filtered}
                selectedFactory={selectedFactory}
                labeledRisks={labeledRisks}
                labeledFactoryIds={labeledFactoryIds}
                showCountyGroups={showCountyGroups}
                countyGroups={countyGroups}
                zoomRequest={zoomRequest}
                onSelectFactory={handleSelectFactory}
                onCountyFocus={handleCountyFocus}
                onCountyGroupClick={handleCountyGroupClick}
            />

            {/* 跨年度走勢浮動面板 */}
            {selectedFactory && showTrendPanel && (
                <FactoryTrendPanel
                    factory={selectedFactory}
                    schemes={schemes}
                    onClose={() => setShowTrendPanel(false)}
                />
            )}
          </div>

        </div>
      </MainLayout>
  );
}

export default HazmatMapPage;
