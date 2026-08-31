import React, { useState } from 'react';
import { useFilterStore } from '@/stores/filter.store';
import { useBranches } from '@/api/branches.api';
import { Calendar, Filter, Building, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalFilters() {
  const { dateRange, setDateRange, dateFrom, dateTo, setCustomDates, selectedBranches, setSelectedBranches } = useFilterStore();
  const { data: branches } = useBranches();
  
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);

  const handleBranchToggle = (id: string) => {
    if (selectedBranches.includes(id)) {
      setSelectedBranches(selectedBranches.filter(b => b !== id));
    } else {
      setSelectedBranches([...selectedBranches, id]);
    }
  };

  const handleSelectAllBranches = () => {
    if (!branches) return;
    if (selectedBranches.length === branches.length) {
      setSelectedBranches([]);
    } else {
      setSelectedBranches(branches.map((b: any) => b.id));
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Date Filter */}
      <div className="relative">
        <Button variant="outline" size="sm" onClick={() => setIsDateOpen(!isDateOpen)} className="gap-2">
          <Calendar className="w-4 h-4" />
          <span className="hidden sm:inline">
            {dateRange === 'ALL' ? 'All Time' : 
             dateRange === 'TODAY' ? 'Today' : 
             dateRange === 'THIS_WEEK' ? 'This Week' : 
             dateRange === 'LAST_30_DAYS' ? 'Last 30 Days' : 'Custom'}
          </span>
          <ChevronDown className="w-3 h-3 text-gray-500" />
        </Button>
        
        {isDateOpen && (
          <div className="absolute right-0 top-full mt-1 w-64 bg-white border rounded-md shadow-lg z-50 p-2">
            <div className="space-y-1">
              {['ALL', 'TODAY', 'THIS_WEEK', 'LAST_30_DAYS'].map((range: any) => (
                <button 
                  key={range}
                  onClick={() => { setDateRange(range); setIsDateOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 ${dateRange === range ? 'bg-blue-50 text-blue-700 font-medium' : ''}`}
                >
                  {range === 'ALL' ? 'All Time' : range === 'TODAY' ? 'Today' : range === 'THIS_WEEK' ? 'This Week' : 'Last 30 Days'}
                </button>
              ))}
              
              <div className="pt-2 border-t mt-2">
                <p className="text-xs text-gray-500 font-medium px-3 mb-2">Custom Range</p>
                <div className="flex gap-2 px-3 pb-2">
                  <input type="date" className="w-full text-xs border rounded p-1" value={dateRange === 'CUSTOM' ? dateFrom : ''} onChange={(e) => setCustomDates(e.target.value, dateTo)} />
                  <input type="date" className="w-full text-xs border rounded p-1" value={dateRange === 'CUSTOM' ? dateTo : ''} onChange={(e) => setCustomDates(dateFrom, e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Branch Filter */}
      <div className="relative">
        <Button variant="outline" size="sm" onClick={() => setIsBranchOpen(!isBranchOpen)} className="gap-2">
          <Building className="w-4 h-4" />
          <span className="hidden sm:inline">
            {selectedBranches.length === 0 ? 'All Branches' : 
             selectedBranches.length === 1 ? branches?.find((b: any) => b.id === selectedBranches[0])?.name : 
             `${selectedBranches.length} Branches`}
          </span>
          <ChevronDown className="w-3 h-3 text-gray-500" />
        </Button>
        
        {isBranchOpen && (
          <div className="absolute right-0 top-full mt-1 w-64 bg-white border rounded-md shadow-lg z-50 py-2 max-h-[300px] overflow-y-auto">
            <button 
              onClick={handleSelectAllBranches}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 font-medium border-b"
            >
              {selectedBranches.length === branches?.length ? 'Deselect All' : 'Select All'}
            </button>
            {branches?.map((b: any) => (
              <label key={b.id} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedBranches.includes(b.id)}
                  onChange={() => handleBranchToggle(b.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="truncate flex-1">{b.name}</span>
                <span className="text-xs text-gray-400">{b.code}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      
      {/* Invisible backdrop to close dropdowns */}
      {(isDateOpen || isBranchOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setIsDateOpen(false); setIsBranchOpen(false); }} />
      )}
    </div>
  );
}
