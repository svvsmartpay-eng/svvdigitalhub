import React, { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { useAssets } from '@/api/assets.api';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AssetListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const { data, isLoading, isError, error, refetch } = useAssets(appliedSearch ? { search: appliedSearch } : undefined);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search);
  };

  const columns = [
    { key: 'assetId', header: 'Asset ID' },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category', render: (row: any) => row.category?.name || '-' },
    { key: 'branch', header: 'Branch', render: (row: any) => row.branch?.name || '-' },
    { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
    { key: 'condition', header: 'Condition' },
    { key: 'actions', header: 'Actions', render: (row: any) => <Button variant="ghost" size="sm" onClick={() => navigate(`/assets/${row.id}`)}>View</Button> }
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Asset Management"
        subtitle="Manage and track all organizational assets"
        actions={<Button onClick={() => navigate('/assets/new')}><Plus className="w-4 h-4 mr-2" />Add Asset</Button>}
      />
      <div className="bg-white p-4 rounded-md shadow-sm border space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search assets..."
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
            <p className="text-red-700 font-medium">Failed to load assets</p>
            <p className="text-red-500 text-sm">{(error as any)?.response?.data?.error || (error as any)?.message}</p>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : (
          <DataTable columns={columns} data={data || []} loading={isLoading} emptyMessage="No assets found." />
        )}
      </div>
    </div>
  );
}
