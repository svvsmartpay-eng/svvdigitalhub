import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useVendor, useVendorPerformance } from '@/api/vendors.api';
import PageHeader from '@/components/shared/PageHeader';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { AlertCircle, Truck, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VendorDetailPage() {
  const { id } = useParams();
  const { data: vendor, isLoading, isError, error, refetch } = useVendor(id!);
  const { data: perf, isLoading: perfLoading } = useVendorPerformance(id!);

  if (isLoading) return <LoadingSpinner fullScreen />;
  
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-700 font-medium">Failed to load vendor</p>
        <p className="text-red-500 text-sm">{(error as any)?.response?.data?.error || (error as any)?.message}</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  if (!vendor) return <div className="p-8 text-center text-gray-500">Vendor not found.</div>;

  return (
    <div className="space-y-6">
      <PageHeader 
        title={vendor.name} 
        subtitle={`Vendor Code: ${vendor.code}`}
        breadcrumbs={[{ label: 'Vendors', href: '/vendors' }, { label: vendor.name }]}
        actions={
          <div className="flex gap-2">
             <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${vendor.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {vendor.isActive ? 'Active' : 'Inactive'}
              </span>
          </div>
        } 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2"><Truck className="w-5 h-5" /> Provider Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <p className="text-sm text-gray-500">Service Types</p>
                   <p className="font-medium">{vendor.serviceTypes?.join(', ') || 'General'}</p>
                 </div>
                 <div>
                   <p className="text-sm text-gray-500">Contact Person</p>
                   <p className="font-medium">{vendor.contactPerson || '—'}</p>
                 </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
             <h3 className="text-lg font-medium mb-4">Performance Metrics</h3>
             {perfLoading ? (
               <div className="py-4 text-center text-gray-500 text-sm animate-pulse">Loading performance...</div>
             ) : perf ? (
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Total Jobs</p>
                    <p className="text-xl font-bold">{perf.totalJobs || 0}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">SLA Breaches</p>
                    <p className="text-xl font-bold text-red-600">{perf.slaBreaches || 0}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Avg Rating</p>
                    <p className="text-xl font-bold text-amber-600">{perf.avgRating ? Number(perf.avgRating).toFixed(1) : '—'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Total Spend</p>
                    <p className="text-xl font-bold text-blue-600">₹{Number(perf.totalSpend || 0).toLocaleString()}</p>
                  </div>
               </div>
             ) : (
               <p className="text-sm text-gray-500">No performance data available.</p>
             )}
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
            <h3 className="text-lg font-medium mb-2">Contact Info</h3>
            
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{vendor.phone || '—'}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{vendor.email || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium text-sm leading-relaxed">
                  {[vendor.addressLine1, vendor.addressLine2, vendor.city, vendor.state, vendor.country].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
