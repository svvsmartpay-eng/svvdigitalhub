import React from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { useParts } from '@/api/parts.api';
import DataTable from '@/components/shared/DataTable';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PartsPage() {
  const { data: response, isLoading } = useParts();
  const parts = response || [];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Parts Inventory" 
        actions={<Button><Package className="w-4 h-4 mr-2" /> Receive Stock</Button>}
      />
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <DataTable
          columns={[
            { key: 'partCode', header: 'Part Code' },
            { key: 'name', header: 'Name' },
            { key: 'stockLevel', header: 'Stock Level' },
            { key: 'unitCost', header: 'Unit Cost', render: (row: any) => `₹${row.unitCost}` },
          ]}
          data={parts}
          loading={isLoading} emptyMessage="No parts found."
        />
      </div>
    </div>
  );
}
