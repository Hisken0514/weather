/**
 * FactoryTrendPanel
 * 地圖右下角浮動的跨年度走勢卡片，點選工廠後出現。
 */
import { useEffect, useState, useRef } from 'react';
import { factoryRiskApi } from '@/lib/api/factoryRisk';
import type { FactoryTrendPointDto } from '@/types/api/factoryRisk';
import type { SchemeListItem } from '@/types/api/riskScoring';
import type { Factory } from '@/components/hazmat-map/hazmatTypes';

interface Props {
    factory: Factory;
    schemes: SchemeListItem[];
    onClose: () => void;
}

interface TrendPoint extends FactoryTrendPointDto {
    // already has dataYear, riskScore, success
}

const BAR_COLORS: Record<string, string> = {
    high: '#E24B4A',
    medium: '#EF9F27',
    mediumLow: '#FAC775',
    low: '#639922',
};

function scoreToRiskLevel(score: number | null | undefined, thresholds = { high: 75, medium: 50, mediumLow: 25 }) {
    if (score == null) return 'low';
    if (score >= thresholds.high) return 'high';
    if (score >= thresholds.medium) return 'medium';
    if (score >= thresholds.mediumLow) return 'mediumLow';
    return 'low';
}

export function FactoryTrendPanel({ factory, schemes, onClose }: Props) {
    const [points, setPoints] = useState<TrendPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fixedSchemeId, setFixedSchemeId] = useState('');
    const prevFactoryId = useRef<string | null>(null);

    useEffect(() => {
        if (!factory.supervisedFactoryId) return;
        // 切換工廠時重置 scheme 選擇
        if (prevFactoryId.current !== factory.supervisedFactoryId) {
            setFixedSchemeId('');
            prevFactoryId.current = factory.supervisedFactoryId;
        }

        setLoading(true);
        setError(null);
        factoryRiskApi
            .getFactoryTrend(factory.supervisedFactoryId, fixedSchemeId || undefined)
            .then(res => setPoints(res.points))
            .catch((e: unknown) => setError(e instanceof Error ? e.message : '載入趨勢失敗'))
            .finally(() => setLoading(false));
    }, [factory.supervisedFactoryId, fixedSchemeId]);

    const successPoints = points.filter(p => p.success && p.riskScore != null);

    // 最新 vs 上一年度差值
    const latestTwo = successPoints.slice(-2);
    const diff =
        latestTwo.length === 2
            ? (latestTwo[1].riskScore ?? 0) - (latestTwo[0].riskScore ?? 0)
            : null;

    // 柱狀圖高度以 0 為基準、最大值當滿版——如實反映分數的絕對比例，不做位移/拉伸。
    const scores = successPoints.map(p => p.riskScore ?? 0);
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

    return (
        <div
            style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 300,
                background: 'white',
                border: '0.5px solid var(--border-strong)',
                borderRadius: 12,
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                zIndex: 20,
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '12px 14px 10px',
                    borderBottom: '0.5px solid var(--border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 8,
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {factory.name}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                        跨年度風險走勢
                    </div>
                </div>
                <button
                    onClick={onClose}
                    aria-label="關閉走勢面板"
                    style={{
                        flexShrink: 0,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        fontSize: 20,
                        lineHeight: 1,
                        padding: '0 2px',
                        marginTop: -1,
                    }}
                >
                    ×
                </button>
            </div>

            {/* Scheme selector */}
            {schemes.length > 0 && (
                <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--border)' }}>
                    <select
                        value={fixedSchemeId}
                        onChange={e => setFixedSchemeId(e.target.value)}
                        style={{
                            width: '100%',
                            fontSize: 13,
                            padding: '5px 8px',
                            borderRadius: 'var(--radius)',
                            border: '0.5px solid var(--border-strong)',
                            background: 'var(--surface-2)',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        <option value="">各年度套用對應標準</option>
                        {schemes.map(s => (
                            <option key={s.id} value={s.id}>
                                固定：{s.year} 年・{s.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Body */}
            <div style={{ padding: '12px 14px 14px' }}>
                {loading && (
                    <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                        載入中…
                    </div>
                )}

                {error && !loading && (
                    <div style={{ fontSize: 13, color: 'var(--text-danger)', padding: '8px 0' }}>
                        {error}
                    </div>
                )}

                {!loading && !error && points.length === 0 && (
                    <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                        無跨年度資料
                    </div>
                )}

                {!loading && !error && successPoints.length > 0 && (
                    <>
                        {/* Bar chart */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: 6,
                                height: 200,
                                marginBottom: 6,
                            }}
                        >
                            {successPoints.map(p => {
                                const score = p.riskScore ?? 0;
                                const heightPct = maxScore > 0 ? (score / maxScore) * 100 : 0;
                                const level = scoreToRiskLevel(p.riskScore);
                                const isLatest = p === successPoints[successPoints.length - 1];
                                return (
                                    <div
                                        key={p.dataYear}
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            height: '100%',
                                            justifyContent: 'flex-end',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: '100%',
                                                height: `${Math.max(heightPct, 6)}%`,
                                                background: BAR_COLORS[level],
                                                borderRadius: '3px 3px 0 0',
                                                opacity: isLatest ? 1 : 0.55,
                                                transition: 'height 0.3s ease',
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* 分數 + 年份標籤——刻意放在 200px 柱狀圖容器「外面」的獨立區塊，
                            不能塞進柱子那個 column 裡面：那個 column 是靠 height:'100%' 撐滿
                            200px 讓柱子百分比高度計算，文字標籤如果混進去會多佔掉一段高度，
                            柱子的 heightPct=100% 就沒辦法真的畫到滿版，跟其他柱子的相對比例
                            也會跟著跑掉。 */}
                        <div
                            style={{
                                display: 'flex',
                                gap: 6,
                                marginBottom: 10,
                            }}
                        >
                            {successPoints.map(p => {
                                const isLatest = p === successPoints[successPoints.length - 1];
                                return (
                                    <div
                                        key={p.dataYear}
                                        style={{
                                            flex: 1,
                                            textAlign: 'center',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 13,
                                                color: isLatest ? 'var(--text-primary)' : 'var(--text-muted)',
                                                fontWeight: isLatest ? 700 : 500,
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            {p.riskScore} 分
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 500,
                                                color: 'var(--text-muted)',
                                            }}
                                        >
                                            {p.dataYear} 年
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Diff badge */}
                        {diff !== null && (
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    padding: '4px 10px',
                                    borderRadius: 'var(--radius)',
                                    background: diff > 0 ? 'var(--bg-danger)' : diff < 0 ? 'var(--bg-success)' : 'var(--surface-1)',
                                    color: diff > 0 ? 'var(--text-danger)' : diff < 0 ? 'var(--text-success)' : 'var(--text-muted)',
                                }}
                            >
                                {diff > 0 ? '↑' : diff < 0 ? '↓' : '—'}
                                {diff !== 0 ? ` ${Math.abs(diff)} 分 vs 上年度` : '與上年度持平'}
                            </div>
                        )}

                        {/* Failed years note */}
                        {points.some(p => !p.success) && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                                {points.filter(p => !p.success).map(p => p.dataYear).join('、')} 年無法計算
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
