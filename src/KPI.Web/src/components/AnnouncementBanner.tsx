'use client';

import { useEffect, useState } from 'react';
import api from '@/utils/api';

interface Announcement {
  isEnabled: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

const STORAGE_KEY = 'announcement_dismissed';

// DaisyUI alert type mapping
const alertClass: Record<string, string> = {
  info: 'alert-info',
  warning: 'alert-warning',
  error: 'alert-error',
};

const Icon = ({ severity }: { severity: string }) => {
  if (severity === 'error') return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
  if (severity === 'warning') return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
    </svg>
  );
};

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await api.get<Announcement>('/Admin/announcement');
        const data = res.data;
        if (!data.isEnabled || !data.message) return;

        // 比對 localStorage 是否已關閉過相同內容
        const dismissed = localStorage.getItem(STORAGE_KEY);
        if (dismissed === data.message) return;

        setAnnouncement(data);
        setVisible(true);
      } catch {
        // 靜默失敗，不影響主要功能
      }
    };
    fetchAnnouncement();
  }, []);

  const handleDismiss = () => {
    if (announcement) {
      localStorage.setItem(STORAGE_KEY, announcement.message);
    }
    setVisible(false);
  };

  if (!visible || !announcement) return null;

  return (
    <div className={`alert ${alertClass[announcement.severity] ?? 'alert-warning'} rounded-none px-4 py-2 flex items-center justify-between gap-2`}>
      <div className="flex items-center gap-2">
        <Icon severity={announcement.severity} />
        <span className="text-sm font-medium">{announcement.message}</span>
      </div>
      <button
        onClick={handleDismiss}
        className="btn btn-ghost btn-xs"
        aria-label="關閉公告"
      >
        ✕
      </button>
    </div>
  );
}
