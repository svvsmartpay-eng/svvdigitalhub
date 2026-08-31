import React from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Briefcase, Activity } from 'lucide-react';

export default function LiveStaffPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['live-staff'],
    queryFn: () => apiClient.get('/users/live/status').then(r => r.data.data),
    refetchInterval: 30000 // poll every 30s
  });

  if (isLoading) return <LoadingSpinner fullScreen />;

  const onlineUsers = data?.filter((u: any) => u.liveStatus === 'ONLINE') || [];
  const offlineUsers = data?.filter((u: any) => u.liveStatus === 'OFFLINE') || [];
  const onLeaveUsers = data?.filter((u: any) => u.liveStatus === 'ON_LEAVE') || [];

  const UserCard = ({ user }: { user: any }) => {
    let statusColor = 'bg-gray-400';
    let statusText = 'Offline';
    if (user.liveStatus === 'ONLINE') { statusColor = 'bg-green-500'; statusText = 'Online'; }
    if (user.liveStatus === 'ON_LEAVE') { statusColor = 'bg-amber-500'; statusText = 'On Leave'; }

    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-500 font-medium">{user.name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${statusColor}`} title={statusText}></span>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm">{user.name}</h4>
            <p className="text-xs text-gray-500 flex items-center gap-1"><Briefcase className="w-3 h-3"/> {user.designation || 'Staff'}</p>
            {user.lastActiveAt && user.liveStatus !== 'ONLINE' && (
              <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3"/> Last active: {new Date(user.lastActiveAt).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Live Staff Status" subtitle="Real-time visibility into staff availability" />

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Online ({onlineUsers.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {onlineUsers.map((u: any) => <UserCard key={u.id} user={u} />)}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> On Leave ({onLeaveUsers.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {onLeaveUsers.map((u: any) => <UserCard key={u.id} user={u} />)}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span> Offline ({offlineUsers.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {offlineUsers.map((u: any) => <UserCard key={u.id} user={u} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
