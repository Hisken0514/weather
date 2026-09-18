/**
 * 將表單 schema + 填寫資料轉成可顯示的欄位清單。
 * 供「督導成效統計」與「工廠改善回覆/機關複查」共用，確保督導發現內容的
 * 欄位標籤、選項文字解析邏輯只有一份。
 */
import type { Field, SelectField, PanelField, PanelDynamicField, FormSchema } from '@/types/form';

export interface ColumnDef {
  name: string;    // 對應 data 的 key
  label: string;   // 顯示用標題
  field?: Field;   // 有 schema 時才有，用於值的解析
}

/** 清除 HTML 標籤 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim() || html;
}

/** 從 SelectField 反查 option value → label */
export function lookupOptionLabel(field: Field, value: string): string {
  if (['select', 'multiselect', 'radio', 'checkbox'].includes(field.type)) {
    const options = (field as SelectField).properties?.options;
    const found = options?.find(o => String(o.value) === value);
    if (found) return found.label;
  }
  return value;
}

/** 將填寫值轉成可顯示的字串 */
export function resolveValue(value: unknown, field?: Field): string {
  if (value === null || value === undefined || value === '') return '—';

  // base64 圖片/簽名
  if (typeof value === 'string' && value.startsWith('data:image/')) {
    return field?.type === 'signature' ? '[已簽名]' : '[圖片]';
  }

  // 陣列（多選、checkbox）
  if (Array.isArray(value)) {
    const parts = value
      .map(v => resolveValue(v, field))
      .filter(v => v !== '—');
    return parts.length > 0 ? parts.join('、') : '—';
  }

  // boolean
  if (typeof value === 'boolean') return value ? '是' : '否';

  // 選項 value → label 反查
  if (field && typeof value === 'string') {
    const label = lookupOptionLabel(field, value);
    if (label !== value) return label; // 有找到對應 label
  }

  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export const SKIP_TYPES = new Set([
  'panel', 'paneldynamic', 'section', 'html',
  'hidden', 'welcome', 'ending', 'downloadreport',
]);

/**
 * 遞迴展開 panel / paneldynamic 內的欄位。
 * Panel 中的欄位（包含 _copy 後綴複製欄位）存放在 properties.fields，
 * 必須遞迴取出才能得到完整的欄位清單。
 */
export function extractFields(fields: Field[]): Field[] {
  const result: Field[] = [];
  for (const f of fields) {
    if (f.type === 'panel') {
      const nested = (f as PanelField).properties?.fields ?? [];
      result.push(...extractFields(nested));
    } else if (f.type === 'paneldynamic') {
      const nested = (f as PanelDynamicField).properties?.fields ?? [];
      result.push(...extractFields(nested));
    } else {
      result.push(f);
    }
  }
  return result;
}

export function schemaToColumns(schema: FormSchema): ColumnDef[] {
  const allFields = schema.pages.flatMap(p => extractFields(p.fields));
  return allFields
    .filter(f => !SKIP_TYPES.has(f.type))
    .map(f => ({
      name: f.name,
      label: f.label ? stripHtml(f.label) : f.name,
      field: f,
    }));
}
