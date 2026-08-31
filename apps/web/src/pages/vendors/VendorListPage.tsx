import React, { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { useVendors } from '@/api/vendors.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Search, Truck } from 'lucide-react';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function VendorListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const { data, isLoading, isError, error, refetch } = useVendors(appliedSearch ? { search: appliedSearch } : undefined);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search);
  };

  const columns = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email' },
    { key: 'city', header: 'City' },
    { key: 'isActive', header: 'Status', render: (row: any) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
        {row.isActive ? 'Active' : 'Inactive'}
      </span>
    )},
    { key: 'actions', header: '', render: (row: any) => (
      <Button variant="ghost" size="sm" onClick={() => navigate(`/vendors/${row.id}`)}>View</Button>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vendors"
        subtitle="External service providers and suppliers"
        actions={<Button onClick={() => alert('Add Vendor form — coming in next phase')}><Truck className="w-4 h-4 mr-2" />Add Vendor</Button>}
      />

      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name or code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">Search</Button>
          {appliedSearch && (
            <Button type="button" variant="ghost" onClick={() => { setSearch(''); setAppliedSearch(''); }}>Clear</Button>
          )}
        </form>

        {isError ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="text-red-700 font-medium">Failed to load vendors</p>
            <p className="text-red-500 text-sm">{(error as any)?.response?.data?.error || (error as any)?.message}</p>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data || []}
            loading={isLoading}
            emptyMessage="No vendors found."
          />
        )}
      </div>
    </div>
  );
}
