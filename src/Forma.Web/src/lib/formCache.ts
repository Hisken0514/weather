import db from './db';
import type { FormDto } from '@/types/api/forms';

/** 快取表單到 IndexedDB（每次成功載入時呼叫） */
export async function cacheForm(form: FormDto): Promise<void> {
  await db.forms.put({
    id: form.id,
    projectId: form.projectId,
    version: form.version,
    formDto: JSON.stringify(form),
    updatedAt: Date.now(),
  });
}

/** 從 IndexedDB 取得快取的表單（離線時使用） */
export async function getCachedForm(formId: string): Promise<FormDto | null> {
  const cached = await db.forms.get(formId);
  if (!cached) return null;
  try {
    return JSON.parse(cached.formDto) as FormDto;
  } catch {
    return null;
  }
}

/** 取得快取表單的版本 */
export async function getCachedFormVersion(formId: string): Promise<string | null> {
  const cached = await db.forms.get(formId);
  return cached?.version ?? null;
}
