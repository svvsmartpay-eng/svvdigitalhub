import { create } from 'zustand';

type DateRangeType = 'TODAY' | 'THIS_WEEK' | 'LAST_30_DAYS' | 'CUSTOM' | 'ALL';

interface FilterState {
  selectedBranches: string[];
  setSelectedBranches: (branches: string[]) => void;
  
  dateRange: DateRangeType;
  setDateRange: (range: DateRangeType) => void;
  
  dateFrom: string;
  dateTo: string;
  setCustomDates: (from: string, to: string) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedBranches: [],
  setSelectedBranches: (branches) => set({ selectedBranches: branches }),
  
  dateRange: 'ALL',
  setDateRange: (range) => {
    if (range === 'ALL') {
      set({ dateRange: range, dateFrom: '', dateTo: '' });
      return;
    }
    
    const now = new Date();
    let from = '';
    let to = '';
    
    if (range === 'TODAY') {
      const today = now.toISOString().split('T')[0];
      from = today;
      to = today;
    } else if (range === 'THIS_WEEK') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      from = start.toISOString().split('T')[0];
      to = now.toISOString().split('T')[0];
    } else if (range === 'LAST_30_DAYS') {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      from = start.toISOString().split('T')[0];
      to = now.toISOString().split('T')[0];
    }
    
    set({ dateRange: range, dateFrom: from, dateTo: to });
  },
  
  dateFrom: '',
  dateTo: '',
  setCustomDates: (from, to) => set({ dateRange: 'CUSTOM', dateFrom: from, dateTo: to }),
}));
