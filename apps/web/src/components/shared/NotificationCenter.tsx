import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkAsRead, useMarkAllRead } from '@/api/notifications.api';
import { Button } from '@/components/ui/button';
import {
  Bell, CheckSquare, AlertCircle, AlertTriangle, Check,
  Cake, Wrench, Shield, Calendar, ArrowRight, X
} from 'lucide-react';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: notificationsData, refetch } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllRead = useMarkAllRead();

  const notifications: any[] = notificationsData || [];
  const unreadList = notifications.filter((n: any) => !n.isRead);
  const unreadCount = unreadList.length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = async (notif: any) => {
    if (!notif.isRead) {
      await markAsRead.mutateAsync(notif.id);
    }
    setIsOpen(false);

    if (notif.referenceType === 'task' && notif.referenceId) {
      navigate(`/tasks/${notif.referenceId}`);
    } else if (notif.referenceType === 'issue' && notif.referenceId) {
      navigate(`/issues/${notif.referenceId}`);
    } else if (notif.referenceType === 'asset' && notif.referenceId) {
      navigate(`/assets/${notif.referenceId}`);
    } else if (notif.referenceType === 'pm' && notif.referenceId) {
      navigate('/pm');
    }
  };

  const getNotifIcon = (type: string, title?: string) => {
    const t = (type || '').toLowerCase();
    const tit = (title || '').toLowerCase();
    if (tit.includes('birthday') || t.includes('birthday')) {
      return <Cake className="w-4 h-4 text-pink-500" />;
    }
    if (t.includes('task') || tit.includes('task')) {
      return <CheckSquare className="w-4 h-4 text-blue-600" />;
    }
    if (t.includes('sla') || tit.includes('breach') || tit.includes('critical')) {
      return <AlertTriangle className="w-4 h-4 text-red-600" />;
    }
    if (t.includes('pm')) {
      return <Calendar className="w-4 h-4 text-amber-600" />;
    }
    return <AlertCircle className="w-4 h-4 text-[#1e3a5f]" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full text-[10px] font-extrabold text-white bg-red-600 ring-2 ring-white flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-gray-50/90 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#1e3a5f]" />
              <span className="text-xs font-bold text-gray-900">Notifications & Alerts</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-[11px] font-semibold text-[#1e3a5f] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400 space-y-1">
                <Bell className="w-8 h-8 mx-auto text-gray-300" />
                <p className="font-semibold text-gray-600">No new notifications</p>
                <p className="text-[11px]">You're all caught up with tasks and tickets.</p>
              </div>
            ) : (
              notifications.slice(0, 15).map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3 text-xs hover:bg-gray-50 cursor-pointer transition-colors flex items-start gap-2.5 ${
                    !n.isRead ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-white border border-gray-200 shrink-0 shadow-2xs mt-0.5">
                    {getNotifIcon(n.type, n.title)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`font-bold truncate text-[11px] ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                        {n.title}
                      </p>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5 leading-snug">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-gray-400 block mt-1">
                      {new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
