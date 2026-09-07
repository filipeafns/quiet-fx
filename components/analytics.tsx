'use client';

import { useEffect } from 'react';
import { startAnalytics } from '@/lib/analytics';

export function Analytics() {
  useEffect(() => {
    startAnalytics();
  }, []);
  return null;
}
