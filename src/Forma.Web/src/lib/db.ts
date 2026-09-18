import Dexie, { type EntityTable } from 'dexie';

export interface CachedForm {
  id: string;
  projectId: string;
  version: string;
  formDto: string;      // JSON serialized FormDto
  updatedAt: number;
}

export interface OfflineSubmission {
  localId?: number;
  formId: string;
  formVersion: string;
  submissionData: string;
  isPublic: boolean;
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'version_conflict';
  error?: string;
  createdAt: number;
}

export interface Draft {
  id: string;
  formId: string;
  data: string;
  updatedAt: number;
}

export interface SyncMeta {
  key: string;
  value: string;
}

const db = new Dexie('formaDb') as Dexie & {
  forms: EntityTable<CachedForm, 'id'>;
  offlineSubmissions: EntityTable<OfflineSubmission, 'localId'>;
  drafts: EntityTable<Draft, 'id'>;
  syncStatus: EntityTable<SyncMeta, 'key'>;
};

db.version(1).stores({
  forms: 'id, projectId, updatedAt',
  offlineSubmissions: '++localId, formId, status, createdAt',
  drafts: 'id, formId, updatedAt',
  syncStatus: 'key',
});

export { db };
export default db;
