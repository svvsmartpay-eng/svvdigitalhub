import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUsers } from '@/api/users.api';
import { apiClient } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';
import { User, Bell, Calendar, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function UserProfilePage() {
  const { user } = useAuthStore();
  const { data: usersData } = useUsers();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    dob: '',
    showBirthdayWishes: true,
    isOnLeave: false,
    backupPersonId: ''
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => apiClient.put('/users/me/profile', data).then(r => r.data),
    onSuccess: () => {
      alert('Profile updated successfully!');
      // Ideally update auth store here or refresh token
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || 'Failed to update profile');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <PageHeader title="My Profile" subtitle="Manage your personal information and preferences" />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-[#1e3a5f]" /> Personal Details</CardTitle>
            <CardDescription>Update your basic contact information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} />
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <input 
                type="checkbox" 
                id="birthdayWishes"
                checked={formData.showBirthdayWishes}
                onChange={e => setFormData({ ...formData, showBirthdayWishes: e.target.checked })}
                className="w-4 h-4 rounded text-[#1e3a5f]"
              />
              <Label htmlFor="birthdayWishes" className="font-normal cursor-pointer">
                Show birthday wishes banner to my branch on my birthday
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-amber-500" /> Leave Management</CardTitle>
            <CardDescription>Set your availability so tasks can be automatically routed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 mb-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
              <input 
                type="checkbox" 
                id="onLeave"
                checked={formData.isOnLeave}
                onChange={e => setFormData({ ...formData, isOnLeave: e.target.checked })}
                className="w-5 h-5 rounded text-amber-600"
              />
              <Label htmlFor="onLeave" className="font-medium cursor-pointer text-amber-900">
                I am currently On Leave
              </Label>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Backup Person <span title="Who should handle your tasks while you are away?"><HelpCircle className="w-3 h-3 text-gray-400" /></span>
              </Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.backupPersonId}
                onChange={e => setFormData({ ...formData, backupPersonId: e.target.value })}
              >
                <option value="">Select a backup person...</option>
                {usersData?.filter((u: any) => u.id !== user?.sub).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.designation || 'Staff'})</option>
                ))}
              </select>
              <p className="text-xs text-gray-500">When you are on leave, your pending tasks and follow-ups will appear in this person's daily alerts.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
          <Button type="submit" loading={updateProfileMutation.isPending}>Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
