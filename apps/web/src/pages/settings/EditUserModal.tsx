import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X, User, Building2, Shield, Calendar, Phone, Mail,
  Briefcase, UserCheck, AlertCircle, Sparkles, Check, KeyRound
} from 'lucide-react';
import { useUsers, useRoles } from '@/api/users.api';
import { useBranches } from '@/api/branches.api';

interface EditUserModalProps {
  user?: any | null; // null for Create User mode
  onClose: () => void;
}

export default function EditUserModal({ user, onClose }: EditUserModalProps) {
  const isCreate = !user || !user.id;
  const queryClient = useQueryClient();
  const { data: allUsers } = useUsers();
  const { data: roles } = useRoles();
  const { data: branches } = useBranches();

  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    designation: '',
    department: '',
    status: 'ACTIVE',
    dob: '',
    dateOfJoining: '',
    isOnLeave: false,
    reportingManagerId: '',
    backupPersonId: '',
    roleIds: [] as string[],
    branchIds: [] as string[],
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.id) {
      const userRoleIds = (user.roles || []).map((r: any) => r.id).filter(Boolean);
      const userBranchIds = (user.branches || []).map((b: any) => b.id).filter(Boolean);

      setFormData({
        employeeId: user.employeeId || '',
        name: user.name || '',
        email: user.email || '',
        phone: user.phone !== '—' ? (user.phone || '') : '',
        password: '',
        designation: user.designation || '',
        department: user.department || '',
        status: user.status || 'ACTIVE',
        dob: user.dob ? user.dob.split('T')[0] : '',
        dateOfJoining: user.dateOfJoining ? user.dateOfJoining.split('T')[0] : '',
        isOnLeave: user.isOnLeave || false,
        reportingManagerId: user.reportingManagerId || (user.reportingManager?.id || ''),
        backupPersonId: user.backupPersonId || (user.backupPerson?.id || ''),
        roleIds: userRoleIds,
        branchIds: userBranchIds,
      });
    } else {
      // Default creation state
      setFormData(prev => ({
        ...prev,
        status: 'ACTIVE',
        employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        dateOfJoining: new Date().toISOString().split('T')[0],
      }));
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isCreate) {
        const res = await apiClient.post('/users', payload);
        return res.data;
      } else {
        const res = await apiClient.put(`/users/${user.id}`, payload);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error || err?.message || `Failed to ${isCreate ? 'create' : 'update'} user`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.branchIds.length === 0) {
      setError('Please assign at least one branch to this user.');
      return;
    }
    if (formData.roleIds.length === 0) {
      setError('Please select at least one role for this user.');
      return;
    }

    mutation.mutate(formData);
  };

  const toggleBranch = (branchId: string) => {
    setFormData(prev => {
      const exists = prev.branchIds.includes(branchId);
      return {
        ...prev,
        branchIds: exists ? prev.branchIds.filter(id => id !== branchId) : [...prev.branchIds, branchId],
      };
    });
  };

  const toggleRole = (roleId: string) => {
    setFormData(prev => {
      const exists = prev.roleIds.includes(roleId);
      return {
        ...prev,
        roleIds: exists ? prev.roleIds.filter(id => id !== roleId) : [...prev.roleIds, roleId],
      };
    });
  };

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 animate-in fade-in duration-150" />
        <Dialog.Content className="fixed top-[50%] left-[50%] max-h-[92vh] w-[95vw] max-w-3xl translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-2xl z-50 overflow-y-auto font-sans animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-5">
            <div>
              <Dialog.Title className="text-base font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-[#1e3a5f]" />
                {isCreate ? 'Add New Team Member' : `Edit User Profile: ${user.name}`}
              </Dialog.Title>
              <p className="text-xs text-gray-500 mt-0.5">
                {isCreate
                  ? 'Configure employee identity, role, and branch access permissions.'
                  : `Employee ID: ${formData.employeeId || 'EMP-XXXX'} · ${user.email}`}
              </p>
            </div>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-600 rounded-full p-1 transition-colors">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {error && (
            <div className="bg-red-50 text-red-800 p-3.5 rounded-xl border border-red-200 text-xs flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ── Section 1: Employee Identity & Contact ──────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-[#1e3a5f]" /> Basic Identity & Contact
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-700">Employee ID *</Label>
                  <Input
                    value={formData.employeeId}
                    onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="e.g. EMP-0042"
                    required
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[11px] font-semibold text-gray-700">Full Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rajesh Sharma"
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-700">Email Address *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. rajesh@svvcommunication.in"
                    required
                    disabled={!isCreate}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-700">Mobile Number</Label>
                  <Input
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="text-xs font-mono"
                  />
                </div>

                {isCreate && (
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-gray-700">Initial Password *</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="e.g. SVV@Change2026"
                      required={isCreate}
                      className="text-xs font-mono"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-700">Designation</Label>
                  <Input
                    value={formData.designation}
                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Senior Branch Manager"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-700">Department</Label>
                  <Input
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Operations / Technical"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-700">Account Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE (Normal Access)</option>
                    <option value="INACTIVE">INACTIVE (Locked)</option>
                    <option value="ON_LEAVE">ON LEAVE (Delegated)</option>
                    <option value="RESIGNED">RESIGNED (Disabled)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Section 2: Role & System Permission ─────────────────────── */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <Shield className="w-3.5 h-3.5 text-[#1e3a5f]" /> Assigned Roles *
                </span>
                <span className="text-[11px] text-gray-400">Select one or more user roles</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {roles && roles.length > 0 ? (
                  roles.map((r: any) => {
                    const isSelected = formData.roleIds.includes(r.id);
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => toggleRole(r.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-all ${
                          isSelected
                            ? 'border-[#1e3a5f] bg-blue-50/80 text-[#1e3a5f] font-semibold ring-1 ring-[#1e3a5f]'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                        }`}
                      >
                        <span className="truncate">{r.name || r.type}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#1e3a5f] shrink-0 ml-1" />}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-400 col-span-3">Loading roles...</p>
                )}
              </div>
            </div>

            {/* ── Section 3: Multi-Branch Assignment ──────────────────────── */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-[#1e3a5f]" /> Branch Assignment (Multi-Branch Support) *
                </span>
                <span className="text-[11px] text-gray-400">Can access selected branches</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {branches && branches.length > 0 ? (
                  branches.map((b: any) => {
                    const isSelected = formData.branchIds.includes(b.id);
                    return (
                      <button
                        type="button"
                        key={b.id}
                        onClick={() => toggleBranch(b.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 font-semibold ring-1 ring-emerald-600'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                        }`}
                      >
                        <div>
                          <div className="font-bold">{b.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{b.code}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-400 col-span-3">Loading branches...</p>
                )}
              </div>
            </div>

            {/* ── Section 4: Hierarchy, Dates & Leave Delegation ─────────── */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-[#1e3a5f]" /> Reporting Line & HR Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-700">Reporting Manager</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                    value={formData.reportingManagerId}
                    onChange={e => setFormData({ ...formData, reportingManagerId: e.target.value })}
                  >
                    <option value="">Select Manager...</option>
                    {allUsers?.filter((u: any) => u.id !== user?.id).map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.designation || 'Manager'})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-700">Backup Person (For Leave)</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                    value={formData.backupPersonId}
                    onChange={e => setFormData({ ...formData, backupPersonId: e.target.value })}
                  >
                    <option value="">Select Backup...</option>
                    {allUsers?.filter((u: any) => u.id !== user?.id).map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.designation || 'Staff'})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-700">Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.dob}
                    onChange={e => setFormData({ ...formData, dob: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-700">Date of Joining</Label>
                  <Input
                    type="date"
                    value={formData.dateOfJoining}
                    onChange={e => setFormData({ ...formData, dateOfJoining: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Leave Toggle Banner */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between gap-3 mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="onLeaveToggle"
                    checked={formData.isOnLeave}
                    onChange={e => setFormData({
                      ...formData,
                      isOnLeave: e.target.checked,
                      status: e.target.checked ? 'ON_LEAVE' : (formData.status === 'ON_LEAVE' ? 'ACTIVE' : formData.status)
                    })}
                    className="w-4 h-4 rounded text-amber-600 cursor-pointer"
                  />
                  <Label htmlFor="onLeaveToggle" className="text-xs font-bold text-amber-900 cursor-pointer">
                    Mark Employee Currently On Leave 🌴
                  </Label>
                </div>
                <span className="text-[11px] text-amber-700 hidden sm:inline">
                  {formData.backupPersonId ? 'Pending items delegated to backup person.' : 'Select a backup person above for automatic delegation.'}
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold px-5 h-9"
                loading={mutation.isPending}
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                {isCreate ? 'Create Team Member' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
