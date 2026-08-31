import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { AlertCircle, Gift, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';

export default function DailyAlerts() {
  const navigate = useNavigate();
  const { data: alerts } = useQuery({
    queryKey: ['daily-alerts'],
    queryFn: () => apiClient.get('/alerts/daily').then(r => r.data.data),
    refetchInterval: 60000
  });

  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="bg-white border-b px-4 py-2 flex items-center gap-4 overflow-x-auto whitespace-nowrap">
      {alerts.map((alert: any) => (
        <div key={alert.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${
          alert.priority === 'HIGH' ? 'bg-red-50 border-red-200 text-red-800' :
          alert.priority === 'MEDIUM' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {alert.type === 'BIRTHDAY' ? <Gift className="w-4 h-4"/> : alert.type === 'FOLLOW_UP' ? <AlertCircle className="w-4 h-4"/> : <Info className="w-4 h-4"/>}
          <span className="font-semibold">{alert.title}</span>
          <span className="text-gray-600 hidden sm:inline"> - {alert.message}</span>
          {alert.actionData?.link && (
            <Button variant="link" size="sm" className="h-auto p-0 ml-2 font-semibold" onClick={() => navigate(alert.actionData.link)}>
              View
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
