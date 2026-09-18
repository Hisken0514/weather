import React, { useEffect, useState, useRef, useCallback } from 'react';
import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import type { FeatureCollection } from 'geojson';
import type { Factory, RiskLevel } from './hazmatTypes';
import { RISK_COLOR, RISK_LABEL, RISK_LEVELS_ORDER, WEST_COUNTIES_NS, EAST_COUNTIES_NS } from './hazmatTypes';

interface CountyGroupItem {
  county: string;
  total: number;
  breakdown: Partial<Record<RiskLevel, number>>;
}

// 暫時只顯示指定的產業園區服務中心轄下園區，其餘 industrial_parks.geojson 內的園區先隱藏（非刪除）。
// 如需全部恢復顯示，把 VISIBLE_PARK_IDS 判斷式拿掉即可（見下方 parks.filter 用法）。
const VISIBLE_PARK_IDS = new Set<number>([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 22, 27, 82, 93, 135, 142, 143, 144, 145, 146,
  147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161,
  162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 175, 176, 177,
  178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192,
  193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207,
  208,
]);

const PARK_FILLS = ['#fde68a', '#fef3c7'];

interface Props {
  factories: Factory[];
  selectedFactory: Factory | null;
  labeledRisks: Set<RiskLevel>;
  labeledFactoryIds: Set<number>;
  showCountyGroups: boolean;
  countyGroups: CountyGroupItem[];
  zoomRequest: { county: string | null; park?: string | null; gen: number };
  onSelectFactory: (factory: Factory) => void;
  onCountyFocus: (geoCountyName: string | null) => void;
  onCountyGroupClick: (county: string) => void;
}

// 畫布配置：地圖置中，西部縣市由北到南排在左側、東部縣市排在右側，
// 一欄放不下（高度超出可視範圍）就往地圖方向多開一欄，不圍成一圈。
const PAD_X = 30;
const PAD_Y = 60;
const MAP_GAP = 30;
const COL_GAP = 14;
const ROW_GAP = 10;

// 字級放大：方塊加寬、加高以容納更大字體
const COUNTY_LBL_W = 210;
const COUNTY_HEADER_H = 26;
const COUNTY_ROW_H = 21;
const COUNTY_PAD = 8;

const MAP_W = 320;
const H = 1000;
const COL_AREA_T = PAD_Y;
const COL_AREA_B = H - PAD_Y;

// 西部固定保留 3 欄：方塊最高只會是 4 個風險等級都有資料（COUNTY_PAD*2 + HEADER + 4*ROW_H = 104px），
// 可視高度 880px 每欄至少放 7 個，19 個西部縣市無論資料多滿都不會超過 3 欄。
const WEST_COLS = 3;
const EAST_COLS = 1;

const MAP_L = PAD_X + WEST_COLS * COUNTY_LBL_W + (WEST_COLS - 1) * COL_GAP + MAP_GAP;
const MAP_R = MAP_L + MAP_W;
const MAP_T = COL_AREA_T;
const MAP_B = COL_AREA_B;

const W = MAP_R + MAP_GAP + EAST_COLS * COUNTY_LBL_W + (EAST_COLS - 1) * COL_GAP + PAD_X;

const LBL_W = 156;
const LBL_H = 92;
const LBL_PAD_Y = 28;
const LBL_NAME_FONT = 14;
const LBL_NAME_MAX_CHARS = 10;
const LBL_NAME_MAX_LINES = 2;

// 文字太長時自動換行（超出行數再截斷加「…」），避免文字溢出卡片外。
function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const lines: string[] = [];
  let rest = text;
  for (let i = 0; i < maxLines && rest.length > 0; i++) {
    const isLast = i === maxLines - 1;
    if (isLast && rest.length > maxCharsPerLine) {
      lines.push(rest.slice(0, maxCharsPerLine - 1) + '…');
      rest = '';
    } else {
      lines.push(rest.slice(0, maxCharsPerLine));
      rest = rest.slice(maxCharsPerLine);
    }
  }
  return lines;
}

function wrapLabelName(text: string): string[] {
  return wrapText(text, LBL_NAME_MAX_CHARS, LBL_NAME_MAX_LINES);
}

interface CountyColItem {
  county: string;
  total: number;
  breakdown: Partial<Record<RiskLevel, number>>;
  rows: RiskLevel[];
  x: number;
  y: number;
  height: number;
}

// 依 order 由北到南依序往下堆疊；一欄的高度超出可視範圍就換到下一欄（往 dir 方向移動）。
function layoutCountyColumns(
    order: string[],
    countyGroups: CountyGroupItem[],
    originX: number,
): CountyColItem[] {
  const items: CountyColItem[] = [];
  let col = 0;
  let y = COL_AREA_T;
  for (const county of order) {
    const g = countyGroups.find(cg => cg.county === county);
    const total = g?.total ?? 0;
    const breakdown = g?.breakdown ?? {};
    const rows = RISK_LEVELS_ORDER.filter(l => (breakdown[l] ?? 0) > 0);
    const height = COUNTY_PAD * 2 + COUNTY_HEADER_H + rows.length * COUNTY_ROW_H;
    if (y > COL_AREA_T && y + height > COL_AREA_B) {
      col++;
      y = COL_AREA_T;
    }
    const x = originX + col * (COUNTY_LBL_W + COL_GAP);
    items.push({ county, total, breakdown, rows, x, y, height });
    y += height + ROW_GAP;
  }
  return items;
}

interface Xform { tx: number; ty: number; sc: number }
const DEFAULT_XFORM: Xform = { tx: 0, ty: 0, sc: 1 };

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function spreadY(count: number): number[] {
  if (count === 0) return [];
  const totalH = MAP_B - MAP_T;
  const step = (totalH - LBL_PAD_Y * 2) / count;
  return Array.from({ length: count }, (_, i) =>
      MAP_T + LBL_PAD_Y + i * step + (step - LBL_H) / 2
  );
}

function dominantColor(
    breakdown: Partial<Record<RiskLevel, number>>,
    activeRisks: Set<RiskLevel>
): string {
  if (activeRisks.size === 0) return '#3b82f6';
  let max = 0; let color = RISK_COLOR.low;
  for (const level of RISK_LEVELS_ORDER) {
    if (!activeRisks.has(level)) continue;
    const n = breakdown[level] ?? 0;
    if (n > max) { max = n; color = RISK_COLOR[level]; }
  }
  return color;
}

interface ParkLabelInput { parkId: number; name: string; cx: number; cy: number }
interface ParkLabelPos { x: number; y: number; leader: boolean }

// 工業園區名稱防重疊排版：以園區中心點為起點，若與已排好的標籤重疊，
// 沿螺旋方向找最近的空位；找到後與原中心點距離夠遠時才畫指示線。
// 座標皆為螢幕（未縮放）空間，因此標籤字級不會隨地圖縮放而跑版。
function layoutParkLabels(parks: ParkLabelInput[], fontSize: number): Map<number, ParkLabelPos> {
  const charW = fontSize * 1.05;
  const boxH = fontSize * 1.6;
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const result = new Map<number, ParkLabelPos>();

  for (const p of parks) {
    const w = p.name.length * charW;
    const h = boxH;
    const overlaps = (x: number, y: number) =>
        placed.some(b => Math.abs(x - b.x) * 2 < (w + b.w) && Math.abs(y - b.y) * 2 < (h + b.h));

    let bestX = p.cx;
    let bestY = p.cy;
    if (overlaps(bestX, bestY)) {
      let found = false;
      for (let radius = h; radius <= h * 9 && !found; radius += h * 0.6) {
        for (let angle = 0; angle < 360; angle += 24) {
          const rad = (angle * Math.PI) / 180;
          const tx = p.cx + radius * Math.cos(rad);
          const ty = p.cy + radius * Math.sin(rad);
          if (!overlaps(tx, ty)) {
            bestX = tx; bestY = ty; found = true; break;
          }
        }
      }
    }
    placed.push({ x: bestX, y: bestY, w, h });
    const leader = Math.hypot(bestX - p.cx, bestY - p.cy) > h * 0.6;
    result.set(p.parkId, { x: bestX, y: bestY, leader });
  }
  return result;
}

export default function TaiwanMap({
                                    factories, selectedFactory, labeledRisks, labeledFactoryIds,
                                    showCountyGroups, countyGroups, zoomRequest,
                                    onSelectFactory, onCountyFocus, onCountyGroupClick,
                                  }: Props) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [townGeojson, setTownGeojson] = useState<FeatureCollection | null>(null);
  const [parkGeojson, setParkGeojson] = useState<FeatureCollection | null>(null);
  const [hoveredCounty, setHoveredCounty] = useState<string | null>(null);
  const [hoveredPark, setHoveredPark] = useState<number | null>(null);
  const [focusedCounty, setFocusedCounty] = useState<string | null>(null);
  const [focusedPark, setFocusedPark] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; factory: Factory } | null>(null);
  const [xform, setXformState] = useState<Xform>(DEFAULT_XFORM);

  const xformRef = useRef<Xform>(DEFAULT_XFORM);
  const animRef = useRef<{ from: Xform; to: Xform; startTime: number; duration: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const labelDragRef = useRef<{ id: number; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [labelPositions, setLabelPositions] = useState<Map<number, { x: number; y: number }>>(new Map());
  const [draggingId, setDraggingId] = useState<number | null>(null);
  // 滑鼠按住拖曳整張地圖平移（只在放大狀態下才有意義）；didPanRef 用來分辨「拖曳」跟「點擊」，
  // 拖過門檻後放開滑鼠的那次 click 要被吞掉，避免誤觸縣市/園區/工廠的點擊事件。
  const panRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);
  const didPanRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  // 直接點地圖上的工廠圓點時設為 true，讓下面「選中工廠時把畫面帶過去」的 effect 知道這次不用平移鏡頭。
  const selectedFromDotRef = useRef(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}taiwan.geojson`).then(r => r.json()).then(setGeojson);
    fetch(`${import.meta.env.BASE_URL}taiwan_townships.geojson`).then(r => r.json()).then(setTownGeojson);
    fetch(`${import.meta.env.BASE_URL}industrial_parks.geojson`).then(r => r.json()).then(setParkGeojson);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const animateTo = useCallback((target: Xform, duration = 900) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    animRef.current = { from: { ...xformRef.current }, to: target, startTime: performance.now(), duration };
    const tick = (now: number) => {
      const a = animRef.current!;
      const rawT = Math.min((now - a.startTime) / a.duration, 1);
      const t = easeInOutCubic(rawT);
      const v: Xform = {
        tx: a.from.tx + (a.to.tx - a.from.tx) * t,
        ty: a.from.ty + (a.to.ty - a.from.ty) * t,
        sc: a.from.sc + (a.to.sc - a.from.sc) * t,
      };
      xformRef.current = v;
      setXformState(v);
      if (rawT < 1) rafRef.current = requestAnimationFrame(tick);
      else { rafRef.current = null; animRef.current = null; }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => { setLabelPositions(new Map()); }, [showCountyGroups]);

  useEffect(() => {
    if (!geojson || zoomRequest.gen === 0) return;
    if (zoomRequest.county === null) {
      setFocusedCounty(null);
      setFocusedPark(null);
      animateTo(DEFAULT_XFORM);
      return;
    }
    const proj = geoMercator().fitExtent([[MAP_L, MAP_T], [MAP_R, MAP_B]], geojson);
    const pg = geoPath().projection(proj);
    const feature = geojson.features.find(f =>
        ((f.properties as any).COUNTYNAME as string).replace(/臺/g, '台') === (zoomRequest.county ?? '').replace(/臺/g, '台')
    );
    if (!feature) return;
    const [[x0, y0], [x1, y1]] = pg.bounds(feature as GeoPermissibleObjects);
    const sc = 0.82 * Math.min(W / (x1 - x0), H / (y1 - y0));
    setFocusedCounty((feature.properties as any).COUNTYNAME as string);
    setFocusedPark(null);
    animateTo({ tx: W / 2 - sc * (x0 + x1) / 2, ty: H / 2 - sc * (y0 + y1) / 2, sc });
  }, [zoomRequest, geojson, animateTo]);

  // 選產業園區篩選器時，跟上面縣市那個 effect 接力：等縣市真的聚焦好（focusedCounty 更新到位）、
  // 園區 geojson 也載入了，才能找到該園區的多邊形範圍，再往內縮放進去。
  useEffect(() => {
    if (!zoomRequest.park || !parkGeojson || !geojson || !focusedCounty) return;
    const feature = parkGeojson.features.find(f =>
        (f.properties as any).name === zoomRequest.park && (f.properties as any).county === focusedCounty
        && VISIBLE_PARK_IDS.has((f.properties as any).parkId as number)
    );
    if (!feature) return;
    const proj = geoMercator().fitExtent([[MAP_L, MAP_T], [MAP_R, MAP_B]], geojson);
    const pg = geoPath().projection(proj);
    const [[x0, y0], [x1, y1]] = pg.bounds(feature as GeoPermissibleObjects);
    if (x1 - x0 === 0 || y1 - y0 === 0) return;
    const sc = 0.82 * Math.min(W / (x1 - x0), H / (y1 - y0));
    setFocusedPark((feature.properties as any).parkId as number);
    animateTo({ tx: W / 2 - sc * (x0 + x1) / 2, ty: H / 2 - sc * (y0 + y1) / 2, sc });
  }, [zoomRequest, parkGeojson, geojson, focusedCounty, animateTo]);

  // 從側邊清單點工廠（而不是直接點地圖上的圓點）時，地圖也要跟著把畫面帶到那家工廠身上，
  // 不然使用者選了半天卻要自己在地圖上大海撈針找是哪一顆。只在座標範圍內、比目前縮放程度更大時才會放大，
  // 已經比這個放大就只平移不縮小，不會打斷使用者自己調整好的縮放程度。
  // 直接點地圖上的圓點選工廠則不做這個動作——工廠本來就在畫面裡，鏡頭跳掉反而讓人以為畫面重置了；
  // selectedFromDotRef 由圓點的 onClick 設定，這裡讀到就跳過平移、只保留選中標記本身的效果。
  useEffect(() => {
    if (selectedFromDotRef.current) { selectedFromDotRef.current = false; return; }
    if (!geojson || !selectedFactory || selectedFactory.lat == null || selectedFactory.lng == null) return;
    const proj = geoMercator().fitExtent([[MAP_L, MAP_T], [MAP_R, MAP_B]], geojson);
    const p = proj([selectedFactory.lng, selectedFactory.lat]);
    if (!p || Number.isNaN(p[0]) || Number.isNaN(p[1])) return;
    const [x, y] = p;
    const targetSc = Math.max(xformRef.current.sc, 2.2);
    animateTo({ tx: W / 2 - x * targetSc, ty: H / 2 - y * targetSc, sc: targetSc }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFactory?.id, geojson]);

  // 滑鼠滾輪縮放地圖（以游標位置為中心），全域檢視、縮放至縣市後都能用；縣市統計欄位固定不受影響。
  // 用原生事件監聽（而非 React 的 onWheel）才能可靠呼叫 preventDefault，避免同時捲動整頁。
  // 依賴 geojson：地圖載入完成前 <svg> 還沒 render，svgRef.current 是 null，effect 一定要等 geojson
  // 到位、svg 真正掛上 DOM 後再重新綁一次，不然滾輪監聽器永遠綁不上，滾輪就會變成捲動整個頁面。
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cur = xformRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newSc = Math.min(1024, Math.max(1, cur.sc * factor));
      if (newSc === cur.sc) return;
      const [px, py] = clientToSvg(e.clientX, e.clientY);
      const mapX = (px - cur.tx) / cur.sc;
      const mapY = (py - cur.ty) / cur.sc;
      const next: Xform = { tx: px - mapX * newSc, ty: py - mapY * newSc, sc: newSc };
      xformRef.current = next;
      setXformState(next);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [geojson]);

  if (!geojson) {
    return (
        <div className="flex-1 flex items-center justify-center text-gray-400 bg-sky-100">
          載入地圖中...
        </div>
    );
  }

  const projection = geoMercator().fitExtent([[MAP_L, MAP_T], [MAP_R, MAP_B]], geojson);
  const pathGen = geoPath().projection(projection);

  const handleCountyClick = (feature: any) => {
    if (didPanRef.current) return;
    const name = feature.properties.COUNTYNAME as string;
    if (focusedCounty === name) {
      setFocusedCounty(null); setFocusedPark(null); animateTo(DEFAULT_XFORM); onCountyFocus(null);
    } else {
      const [[x0, y0], [x1, y1]] = pathGen.bounds(feature as GeoPermissibleObjects);
      const sc = 0.82 * Math.min(W / (x1 - x0), H / (y1 - y0));
      setFocusedCounty(name);
      setFocusedPark(null);
      animateTo({ tx: W / 2 - sc * (x0 + x1) / 2, ty: H / 2 - sc * (y0 + y1) / 2, sc });
      onCountyFocus(name);
    }
    setTooltip(null);
  };

  const returnToCounty = () => {
    if (didPanRef.current) return;
    setFocusedPark(null);
    const countyFeature = geojson.features.find(f => (f.properties as any).COUNTYNAME === focusedCounty);
    if (!countyFeature) return;
    const [[x0, y0], [x1, y1]] = pathGen.bounds(countyFeature as GeoPermissibleObjects);
    const sc = 0.82 * Math.min(W / (x1 - x0), H / (y1 - y0));
    animateTo({ tx: W / 2 - sc * (x0 + x1) / 2, ty: H / 2 - sc * (y0 + y1) / 2, sc });
  };

  const handleParkClick = (e: React.MouseEvent, f: any) => {
    e.stopPropagation();
    if (didPanRef.current) return;
    const parkId = (f.properties as any).parkId as number;
    if (focusedPark === parkId) { returnToCounty(); return; }
    const [[x0, y0], [x1, y1]] = pathGen.bounds(f as GeoPermissibleObjects);
    const sc = 0.82 * Math.min(W / (x1 - x0), H / (y1 - y0));
    setFocusedPark(parkId);
    animateTo({ tx: W / 2 - sc * (x0 + x1) / 2, ty: H / 2 - sc * (y0 + y1) / 2, sc });
  };

  const handleCountyAggClick = (county: string) => {
    const feature = geojson.features.find(f =>
        ((f.properties as any).COUNTYNAME as string).replace(/臺/g, '台') === county
    );
    if (feature) handleCountyClick(feature);
  };

  const resetFocus = () => {
    if (didPanRef.current) return;
    setFocusedCounty(null); setFocusedPark(null); animateTo(DEFAULT_XFORM); onCountyFocus(null); setTooltip(null);
  };

  // 全域檢視的手動縮放按鈕：以地圖中心為基準，與滾輪縮放共用同一個 xform。
  const zoomAtMapCenter = (newSc: number) => {
    const cur = xformRef.current;
    const cx = (MAP_L + MAP_R) / 2; const cy = (MAP_T + MAP_B) / 2;
    const mapX = (cx - cur.tx) / cur.sc;
    const mapY = (cy - cur.ty) / cur.sc;
    animateTo({ tx: cx - mapX * newSc, ty: cy - mapY * newSc, sc: newSc }, 250);
  };
  const handleZoomIn = () => zoomAtMapCenter(Math.min(1024, xformRef.current.sc * 1.4));
  const handleZoomOut = () => zoomAtMapCenter(Math.max(1, xformRef.current.sc / 1.4));
  const handleZoomResetClick = () => animateTo(DEFAULT_XFORM, 250);

  function clientToSvg(clientX: number, clientY: number): [number, number] {
    if (!svgRef.current) return [clientX, clientY];
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const svgPt = pt.matrixTransform(svgRef.current.getScreenCTM()!.inverse());
    return [svgPt.x, svgPt.y];
  }
  function handleLabelMouseDown(e: React.MouseEvent, id: number, curX: number, curY: number) {
    e.preventDefault(); e.stopPropagation();
    const [sx, sy] = clientToSvg(e.clientX, e.clientY);
    labelDragRef.current = { id, startX: sx, startY: sy, origX: curX, origY: curY };
    setDraggingId(id);
  }
  // 在地圖背景按住滑鼠開始拖曳平移；只在已放大（sc > 1）時才有意義，避免全域檢視下誤拖。
  function handleMapMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0 || labelDragRef.current || xformRef.current.sc <= 1) return;
    const [sx, sy] = clientToSvg(e.clientX, e.clientY);
    panRef.current = { startX: sx, startY: sy, startTx: xformRef.current.tx, startTy: xformRef.current.ty };
  }
  function handleSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (labelDragRef.current) {
      const d = labelDragRef.current;
      const [sx, sy] = clientToSvg(e.clientX, e.clientY);
      setLabelPositions(prev => {
        const next = new Map(prev);
        next.set(d.id, { x: d.origX + sx - d.startX, y: d.origY + sy - d.startY });
        return next;
      });
      return;
    }
    if (panRef.current) {
      const [sx, sy] = clientToSvg(e.clientX, e.clientY);
      const dx = sx - panRef.current.startX;
      const dy = sy - panRef.current.startY;
      if (!didPanRef.current && Math.hypot(dx, dy) > 3) {
        didPanRef.current = true;
        setIsPanning(true);
      }
      if (didPanRef.current) {
        const next: Xform = { ...xformRef.current, tx: panRef.current.startTx + dx, ty: panRef.current.startTy + dy };
        xformRef.current = next;
        setXformState(next);
      }
    }
  }
  function handleSvgMouseUp() {
    labelDragRef.current = null;
    setDraggingId(null);
    if (panRef.current) {
      panRef.current = null;
      setIsPanning(false);
      if (didPanRef.current) {
        // 這次放開滑鼠緊接著會觸發一個 click 事件，等它跑完（同一輪 microtask 之後）再解除，
        // 讓下面各個 onClick 有機會先讀到 didPanRef.current === true 藉此吞掉這次誤觸的點擊。
        setTimeout(() => { didPanRef.current = false; }, 0);
      }
    }
  }

  const focusedNormalized = focusedCounty?.replace(/臺/g, '台') ?? null;
  const plottable = factories.filter(f => f.lat != null && f.lng != null);
  const visibleFactories = showCountyGroups
      ? []
      : (focusedNormalized ? plottable.filter(f => f.county === focusedNormalized) : plottable)
          .filter(f => labeledRisks.size === 0 || labeledRisks.has(f.riskLevel));

  const labelItems = showCountyGroups
      ? []
      : plottable
          .filter(f => labeledFactoryIds.has(f.id))
          .map(f => {
            const p = projection([f.lng!, f.lat!])!;
            return { factory: f, cx: p[0], cy: p[1] };
          });

  const leftItems  = labelItems.filter(d => d.cx <= W / 2).sort((a, b) => a.cy - b.cy);
  const rightItems = labelItems.filter(d => d.cx > W / 2).sort((a, b) => a.cy - b.cy);
  const leftYs  = spreadY(leftItems.length);
  const rightYs = spreadY(rightItems.length);
  const LEFT_BOX_X = MAP_L - 8 - LBL_W;
  const RIGHT_BOX_X = MAP_R + 8;

  // 地圖上的縣市泡泡只標出有資料的縣市，避免 22 顆大多是 0 的泡泡把地圖擠滿
  const nonZeroCountyGroups = countyGroups.filter(g => g.total > 0);
  const maxTotal = nonZeroCountyGroups.length > 0 ? Math.max(...nonZeroCountyGroups.map(g => g.total)) : 1;

  // 縣市統計欄：固定顯示全部 22 縣市（0 筆也列出），不拉線指向地理位置，
  // 西部（含離島）由北到南排左側、東部由北到南排右側，一欄放不下就往地圖方向多開一欄。
  const countyDetailItems = showCountyGroups
      ? [
        ...layoutCountyColumns(WEST_COUNTIES_NS, countyGroups, PAD_X),
        ...layoutCountyColumns(EAST_COUNTIES_NS, countyGroups, MAP_R + MAP_GAP),
      ]
      : [];

  const { tx, ty, sc } = xform;
  const sw = (base: number) => base / sc;

  // 縮放至縣市後顯示的工業園區清單（含多邊形路徑與中心點），標籤排版與點擊都共用這份資料。
  const focusedParks = (focusedCounty && parkGeojson)
      ? parkGeojson.features
          .map(f => {
            if ((f.properties as any).county !== focusedCounty) return null;
            const parkId = (f.properties as any).parkId as number;
            if (!VISIBLE_PARK_IDS.has(parkId)) return null;
            const [[bx0, by0], [bx1, by1]] = pathGen.bounds(f as GeoPermissibleObjects);
            if (bx1 - bx0 > 1000 || by1 - by0 > 1000) return null;
            const d = pathGen(f as GeoPermissibleObjects);
            const centroid = pathGen.centroid(f as GeoPermissibleObjects);
            if (!d || !centroid || isNaN(centroid[0])) return null;
            return {
              feature: f, parkId,
              name: (f.properties as any).name as string,
              d, cx: centroid[0], cy: centroid[1],
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
      : [];

  const PARK_LABEL_FONT = 17;
  const parkLabelLayout = layoutParkLabels(
      focusedParks.map(p => ({ parkId: p.parkId, name: p.name, cx: p.cx * sc + tx, cy: p.cy * sc + ty })),
      PARK_LABEL_FONT,
  );

  return (
      <div className="flex-1 relative overflow-hidden bg-sky-100">
        <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-full"
            style={{ cursor: isPanning ? 'grabbing' : xform.sc > 1 ? 'grab' : 'default' }}
            onMouseDown={handleMapMouseDown}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onMouseLeave={() => { setTooltip(null); handleSvgMouseUp(); }}
        >
          <defs>
            <filter id="shadow">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15" />
            </filter>
          </defs>

          {focusedCounty && (
              <rect x={0} y={0} width={W} height={H} fill="transparent"
                    onClick={focusedPark !== null ? returnToCounty : resetFocus} />
          )}

          <g transform={`translate(${tx} ${ty}) scale(${sc})`}>
            {geojson.features.map(feature => {
              const code = (feature.properties as any).COUNTYCODE as string;
              const name = (feature.properties as any).COUNTYNAME as string;
              const d = pathGen(feature as GeoPermissibleObjects);
              if (!d) return null;
              const isFocused = focusedCounty === name;
              const dimmed = !!focusedCounty && !isFocused;
              if (isFocused) return null; // 鄉鎮多邊形取代縣市底圖
              return (
                  <path
                      key={code}
                      d={d}
                      fill={dimmed ? '#dbeafe' : hoveredCounty === code ? '#7dd3fc' : '#bfdbfe'}
                      stroke={dimmed ? '#93c5fd' : '#fff'}
                      strokeWidth={sw(0.7)}
                      opacity={dimmed ? 0.45 : 1}
                      style={{ transition: 'opacity 0.75s ease-in-out, fill 0.3s', cursor: 'pointer' }}
                      onMouseEnter={() => { if (!dimmed) setHoveredCounty(code); }}
                      onMouseLeave={() => setHoveredCounty(null)}
                      onClick={e => { e.stopPropagation(); handleCountyClick(feature); }}
                  >
                    <title>{name}</title>
                  </path>
              );
            })}

            {/* 鄉鎮分界線（縮放至縣市後作為底圖，僅顯示邊界供參考，不可互動；工業園區疊在上層） */}
            {focusedCounty && townGeojson && (() => {
              const matchName = focusedCounty === '桃園市' ? '桃園縣' : focusedCounty;
              const towns = townGeojson.features.filter(f => (f.properties as any).county === matchName);
              return towns.map(f => {
                const d = pathGen(f as GeoPermissibleObjects);
                if (!d) return null;
                const townId = (f.properties as any).town_id as string;
                return (
                    <path
                        key={townId}
                        d={d}
                        fill="#f1f5f9"
                        stroke="#94a3b8"
                        strokeWidth={sw(0.6)}
                        style={{ pointerEvents: 'none' }}
                    />
                );
              });
            })()}

            {/* 工業園區填色（縮放至縣市後取代縣市底圖，僅顯示該縣市內的園區；名稱標籤改在地圖座標系外以螢幕座標繪製，見下方） */}
            {focusedCounty && focusedParks.map((p, i) => {
              const isHovered = hoveredPark === p.parkId;
              return (
                  <path
                      key={p.parkId}
                      d={p.d}
                      fill={isHovered ? '#fbbf24' : PARK_FILLS[i % 2]}
                      stroke="#d97706"
                      strokeWidth={sw(0.8)}
                      style={{ transition: 'fill 0.2s', cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredPark(p.parkId)}
                      onMouseLeave={() => setHoveredPark(null)}
                      onClick={e => handleParkClick(e, p.feature)}
                  />
              );
            })}

            {showCountyGroups && nonZeroCountyGroups.map(({ county, total, breakdown }) => {
              const feature = geojson.features.find(f =>
                  ((f.properties as any).COUNTYNAME as string).replace(/臺/g, '台') === county
              );
              if (!feature) return null;
              const centroid = pathGen.centroid(feature as GeoPermissibleObjects);
              if (!centroid || isNaN(centroid[0])) return null;
              const [cx, cy] = centroid;
              const r = sw(14 + Math.sqrt(total / maxTotal) * 22);
              const color = dominantColor(breakdown, labeledRisks);
              const fontSize = sw(total >= 100 ? 14 : 16);
              return (
                  <g
                      key={county}
                      style={{ cursor: 'pointer' }}
                      onClick={e => { e.stopPropagation(); if (didPanRef.current) return; handleCountyAggClick(county); onCountyGroupClick(county); }}
                      onMouseEnter={() => setHoveredCounty(county)}
                      onMouseLeave={() => setHoveredCounty(null)}
                  >
                    <circle cx={cx} cy={cy} r={r * 1.35}
                            fill={color} opacity={hoveredCounty === county ? 0.18 : 0.10} />
                    <circle cx={cx} cy={cy} r={r}
                            fill={color} opacity={0.88}
                            stroke="#fff" strokeWidth={sw(1.8)} />
                    <text x={cx} y={cy} fontSize={fontSize} fill="white"
                          textAnchor="middle" dominantBaseline="central" fontWeight="700">
                      {total}
                    </text>
                    <text x={cx} y={cy + r + sw(14)} fontSize={sw(14)} fill="#1e3a5f"
                          textAnchor="middle" fontWeight="700">
                      {county}
                    </text>
                  </g>
              );
            })}

            {visibleFactories.map(factory => {
              const p = projection([factory.lng!, factory.lat!]);
              if (!p) return null;
              const [cx, cy] = p;
              const isSelected = selectedFactory?.id === factory.id;
              const isUp = !!factory.riskIncreased;
              // 選到一個之後，其餘工廠淡出，用對比把被選中的凸顯出來（工廠一多光靠放大很難看出來）
              const dimmed = !!selectedFactory && !isSelected;
              return (
                  <g
                      key={factory.id}
                      style={{ cursor: 'pointer' }}
                      onClick={e => { e.stopPropagation(); if (didPanRef.current) return; selectedFromDotRef.current = true; onSelectFactory(factory); }}
                      onMouseEnter={() => setTooltip({ x: cx, y: cy, factory })}
                      onMouseLeave={() => setTooltip(null)}
                  >
                    {isSelected && (
                        <>
                          {/* 脈動擴散圈：持續動畫，在滿版工廠點裡最容易被眼睛捕捉到 */}
                          <circle cx={cx} cy={cy} r={sw(11)} fill="none" stroke="#2563eb" strokeWidth={sw(2.5)}>
                            <animate attributeName="r" values={`${sw(11)};${sw(26)}`} dur="1.4s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.7;0" dur="1.4s" repeatCount="indefinite" />
                          </circle>
                          <circle cx={cx} cy={cy} r={sw(16)} fill="none" stroke="#2563eb" strokeWidth={sw(2)} opacity={0.5} />
                        </>
                    )}
                    {/* 風險較去年上升：加一圈紅色警示外環，與其他工廠明顯區隔 */}
                    {isUp && (
                        <circle cx={cx} cy={cy} r={sw(isSelected ? 20 : 15)} fill="none"
                                stroke="#dc2626" strokeWidth={sw(3)} strokeDasharray={sw(4)} opacity={dimmed ? 0.25 : 0.95} />
                    )}
                    <circle
                        cx={cx} cy={cy}
                        r={sw(isSelected ? 12 : 7)}
                        fill={RISK_COLOR[factory.riskLevel]}
                        stroke={isSelected ? '#2563eb' : '#fff'}
                        strokeWidth={sw(isSelected ? 3 : 1.5)}
                        opacity={dimmed ? 0.3 : 0.93}
                        style={{ transition: 'opacity 0.25s' }}
                    />
                    {/* 選中工廠上方掛一根藍色指標（不隨風險顏色改變、跟其他標記明顯不同），指到工廠正上方 */}
                    {isSelected && (
                        <g transform={`translate(${cx} ${cy - sw(12)})`}>
                          <path
                              d={`M 0 0 L ${-sw(9)} ${-sw(16)} A ${sw(9)} ${sw(9)} 0 1 1 ${sw(9)} ${-sw(16)} Z`}
                              fill="#2563eb" stroke="#fff" strokeWidth={sw(1.5)}
                          />
                          <circle cx={0} cy={-sw(16)} r={sw(3.5)} fill="#fff" />
                        </g>
                    )}
                    {isUp && (
                        <g transform={`translate(${cx + sw(isSelected ? 12 : 9)} ${cy - sw(isSelected ? 12 : 9)})`} opacity={dimmed ? 0.3 : 1}>
                          <circle r={sw(9)} fill="#dc2626" stroke="#fff" strokeWidth={sw(1.5)} />
                          <text y={sw(3.8)} fontSize={sw(12)} fill="white" textAnchor="middle" fontWeight="800">!</text>
                        </g>
                    )}
                  </g>
              );
            })}
          </g>

          {/* 工業園區名稱標籤：以螢幕座標繪製（不隨地圖縮放），彼此重疊時會被排到旁邊並拉出指示線；
            點文字或底色方塊都能放大聚焦該園區，效果與點多邊形本身相同。 */}
          {focusedCounty && focusedParks.map(p => {
            const layout = parkLabelLayout.get(p.parkId);
            if (!layout) return null;
            const origX = p.cx * sc + tx;
            const origY = p.cy * sc + ty;
            const isHovered = hoveredPark === p.parkId;
            const textWidth = p.name.length * PARK_LABEL_FONT * 1.05;
            return (
                <g
                    key={`park-label-${p.parkId}`}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPark(p.parkId)}
                    onMouseLeave={() => setHoveredPark(null)}
                    onClick={e => handleParkClick(e, p.feature)}
                >
                  {layout.leader && (
                      <line x1={origX} y1={origY} x2={layout.x} y2={layout.y}
                            stroke="#b45309" strokeWidth={1} strokeDasharray="3,2" opacity={0.6} />
                  )}
                  <rect
                      x={layout.x - textWidth / 2 - 4} y={layout.y - PARK_LABEL_FONT * 0.8 - 2}
                      width={textWidth + 8} height={PARK_LABEL_FONT * 1.6 + 4} rx={4}
                      fill={isHovered ? '#fde68a' : 'rgba(255,255,255,0.88)'}
                      stroke={isHovered ? '#d97706' : '#e5c88a'} strokeWidth={1}
                  />
                  <text
                      x={layout.x} y={layout.y}
                      fontSize={PARK_LABEL_FONT}
                      fill="#92400e"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontWeight="600"
                      style={{ userSelect: 'none' }}
                  >
                    {p.name}
                  </text>
                </g>
            );
          })}

          {leftItems.map(({ factory, cx, cy }, i) => {
            const pos = labelPositions.get(factory.id);
            const lx = pos?.x ?? LEFT_BOX_X; const ly = pos?.y ?? leftYs[i];
            const lcx = lx + LBL_W / 2; const lcy = ly + LBL_H / 2;
            const fsx = cx * sc + tx; const fsy = cy * sc + ty;
            return (
                <g key={`ll-${factory.id}`}
                   style={{ cursor: draggingId === factory.id ? 'grabbing' : 'grab' }}
                   onMouseDown={e => handleLabelMouseDown(e, factory.id, lx, ly)}>
                  <line x1={fsx} y1={fsy} x2={lcx} y2={lcy}
                        stroke={RISK_COLOR[factory.riskLevel]} strokeWidth={1.1} strokeDasharray="4,3" opacity={0.65} />
                  <rect x={lx} y={ly} width={LBL_W} height={LBL_H} rx={5}
                        fill="white" stroke={factory.riskIncreased ? '#dc2626' : RISK_COLOR[factory.riskLevel]} strokeWidth={factory.riskIncreased ? 2 : 1.3} />
                  <rect x={lx} y={ly} width={LBL_W} height={15} rx={5} fill={RISK_COLOR[factory.riskLevel]} />
                  <rect x={lx} y={ly + 10} width={LBL_W} height={5} fill={RISK_COLOR[factory.riskLevel]} />
                  <text x={lx + LBL_W / 2} y={ly + 11} fontSize={11} fill="white" textAnchor="middle" fontWeight="700">{RISK_LABEL[factory.riskLevel]}</text>
                  {wrapLabelName(factory.name).map((line, li) => (
                      <text key={li} x={lx + 7} y={ly + 29 + li * (LBL_NAME_FONT + 4)} fontSize={LBL_NAME_FONT} fill="#1f2937" fontWeight="700">{line}</text>
                  ))}
                  <text x={lx + 7} y={ly + 67} fontSize={12} fill="#6b7280">{factory.county}</text>
                  {factory.riskIncreased && (
                      <text x={lx + 7} y={ly + 83} fontSize={10.5} fill="#dc2626" fontWeight="700">⚠ 較去年上升（{factory.prevRiskScore}分）</text>
                  )}
                </g>
            );
          })}
          {rightItems.map(({ factory, cx, cy }, i) => {
            const pos = labelPositions.get(factory.id);
            const lx = pos?.x ?? RIGHT_BOX_X; const ly = pos?.y ?? rightYs[i];
            const lcx = lx + LBL_W / 2; const lcy = ly + LBL_H / 2;
            const fsx = cx * sc + tx; const fsy = cy * sc + ty;
            return (
                <g key={`rl-${factory.id}`}
                   style={{ cursor: draggingId === factory.id ? 'grabbing' : 'grab' }}
                   onMouseDown={e => handleLabelMouseDown(e, factory.id, lx, ly)}>
                  <line x1={fsx} y1={fsy} x2={lcx} y2={lcy}
                        stroke={RISK_COLOR[factory.riskLevel]} strokeWidth={1.1} strokeDasharray="4,3" opacity={0.65} />
                  <rect x={lx} y={ly} width={LBL_W} height={LBL_H} rx={5}
                        fill="white" stroke={factory.riskIncreased ? '#dc2626' : RISK_COLOR[factory.riskLevel]} strokeWidth={factory.riskIncreased ? 2 : 1.3} />
                  <rect x={lx} y={ly} width={LBL_W} height={15} rx={5} fill={RISK_COLOR[factory.riskLevel]} />
                  <rect x={lx} y={ly + 10} width={LBL_W} height={5} fill={RISK_COLOR[factory.riskLevel]} />
                  <text x={lx + LBL_W / 2} y={ly + 11} fontSize={11} fill="white" textAnchor="middle" fontWeight="700">{RISK_LABEL[factory.riskLevel]}</text>
                  {wrapLabelName(factory.name).map((line, li) => (
                      <text key={li} x={lx + 7} y={ly + 29 + li * (LBL_NAME_FONT + 4)} fontSize={LBL_NAME_FONT} fill="#1f2937" fontWeight="700">{line}</text>
                  ))}
                  <text x={lx + 7} y={ly + 67} fontSize={12} fill="#6b7280">{factory.county}</text>
                  {factory.riskIncreased && (
                      <text x={lx + 7} y={ly + 83} fontSize={10.5} fill="#dc2626" fontWeight="700">⚠ 較去年上升（{factory.prevRiskScore}分）</text>
                  )}
                </g>
            );
          })}

          {countyDetailItems.map(d => {
            const isEmpty = d.total === 0;
            return (
                <g key={`col-${d.county}`}
                   style={{ cursor: 'pointer' }}
                   opacity={isEmpty ? 0.55 : 1}
                   onClick={() => { handleCountyAggClick(d.county); onCountyGroupClick(d.county); }}>
                  <rect x={d.x} y={d.y} width={COUNTY_LBL_W} height={d.height} rx={5}
                        fill="white" stroke={isEmpty ? '#cbd5e1' : '#94a3b8'} strokeWidth={1.2} />
                  <text x={d.x + 10} y={d.y + COUNTY_PAD + 16} fontSize={19} fontWeight={700}
                        fill={isEmpty ? '#94a3b8' : '#1e293b'}>
                    {d.county}（{d.total}家）
                  </text>
                  {d.rows.map((level, ri) => (
                      <g key={level}>
                        <rect x={d.x + 10} y={d.y + COUNTY_PAD + COUNTY_HEADER_H + ri * COUNTY_ROW_H} width={13} height={13} fill={RISK_COLOR[level]} />
                        <text x={d.x + 28} y={d.y + COUNTY_PAD + COUNTY_HEADER_H + ri * COUNTY_ROW_H + 12} fontSize={17} fill="#334155">
                          {RISK_LABEL[level]}：{d.breakdown[level]}
                        </text>
                      </g>
                  ))}
                </g>
            );
          })}

          {tooltip && (!labeledRisks.has(tooltip.factory.riskLevel) || !!focusedCounty) && (() => {
            const { x, y, factory } = tooltip;
            const sx = x * sc + tx; const sy = y * sc + ty;
            const bw = 210;
            // 風險等級小標籤自己獨立佔一行（貼右上角），公司名稱另起一行、可換行，
            // 兩者不會擠在同一行互相覆蓋。
            const nameLines = wrapText(factory.name, 13, 2);
            const nameLineH = 19;
            const nameBlockH = nameLines.length * nameLineH;
            const yPillRow = 9;
            const yNameStart = yPillRow + 33;
            const yCounty = yNameStart + nameBlockH + 7;
            const yChem = yCounty + 19;
            const yWarn = yChem + 19;
            const bh = (factory.riskIncreased ? yWarn : yChem) + 11;
            const tbx = sx + bw + 14 > W ? sx - bw - 8 : sx + 9;
            const tby = sy + bh + 4 > H ? sy - bh - 4 : sy - 4;
            return (
                <g style={{ pointerEvents: 'none' }} filter="url(#shadow)">
                  <rect x={tbx} y={tby} width={bw} height={bh} rx={6} fill="white" stroke={factory.riskIncreased ? '#dc2626' : '#e5e7eb'} strokeWidth={factory.riskIncreased ? 1.5 : 1} />
                  <rect x={tbx + bw - 56} y={tby + yPillRow} width={48} height={20} rx={10} fill={RISK_COLOR[factory.riskLevel]} />
                  <text x={tbx + bw - 32} y={tby + yPillRow + 14} fontSize={12} fill="white" textAnchor="middle" fontWeight="700">{RISK_LABEL[factory.riskLevel]}</text>
                  {nameLines.map((line, li) => (
                      <text key={li} x={tbx + 11} y={tby + yNameStart + li * nameLineH} fontSize={15} fontWeight="700" fill="#1f2937">{line}</text>
                  ))}
                  <text x={tbx + 11} y={tby + yCounty} fontSize={12.5} fill="#6b7280">{factory.county}</text>
                  <text x={tbx + 11} y={tby + yChem} fontSize={12.5} fill="#9ca3af">{factory.chemicals?.join('、')}</text>
                  {factory.riskIncreased && (
                      <text x={tbx + 11} y={tby + yWarn} fontSize={12.5} fill="#dc2626" fontWeight="700">⚠ 較去年（{factory.prevRiskScore} 分）上升</text>
                  )}
                </g>
            );
          })()}
        </svg>

        {focusedCounty && (
            <button
                className="absolute top-3 left-3 bg-white/90 text-xs text-blue-700 font-medium px-3 py-1.5 rounded-full shadow hover:bg-white transition-colors z-10"
                onClick={focusedPark !== null ? returnToCounty : resetFocus}
            >
              ← {focusedPark !== null ? `返回 ${focusedCounty.replace(/臺/g, '台')}` : '返回全台'}
            </button>
        )}

        {!focusedCounty && showCountyGroups && (
            <div className="absolute top-3 left-3 flex flex-col bg-white/90 rounded-lg shadow z-10 overflow-hidden">
              <button
                  className="w-8 h-8 flex items-center justify-center text-gray-700 text-lg font-bold hover:bg-gray-100 border-b border-gray-200"
                  onClick={handleZoomIn}
                  title="放大"
              >
                +
              </button>
              <button
                  className="w-8 h-8 flex items-center justify-center text-gray-700 text-lg font-bold hover:bg-gray-100"
                  onClick={handleZoomOut}
                  title="縮小"
              >
                −
              </button>
              {xform.sc > 1 && (
                  <button
                      className="w-8 h-8 flex items-center justify-center text-gray-500 text-xs hover:bg-gray-100 border-t border-gray-200"
                      onClick={handleZoomResetClick}
                      title="重置"
                  >
                    1:1
                  </button>
              )}
            </div>
        )}

        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md p-3 z-10">
          <div className="text-sm font-semibold text-gray-700 mb-2">風險等級</div>
          {RISK_LEVELS_ORDER.map(level => (
              <div key={level} className="flex items-center gap-2 mb-1">
                <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: RISK_COLOR[level] }} />
                <span className="text-sm text-gray-600">{RISK_LABEL[level]}</span>
              </div>
          ))}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-red-600" />
            <span className="text-sm text-red-600 font-medium">較去年上升</span>
          </div>
        </div>
      </div>
  );
}