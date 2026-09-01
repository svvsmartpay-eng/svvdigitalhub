import React, { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { useUsers, useResetPassword, useRoles, useDeleteUser } from '@/api/users.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePluginSettings, useTogglePlugin } from '@/api/plugins.api';
import {
  AlertCircle, Settings, Users, Shield, UserPlus, KeyRound,
  Building2, Phone, Mail, CheckCircle2, UserCheck, Search,
  Calendar, Check, User as UserIcon, RefreshCw, Sparkles,
  Printer, MessageSquare, ToggleLeft, ToggleRight, CheckSquare, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EditUserModal from './EditUserModal';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

type Tab = 'users' | 'roles' | 'modules' | 'organization';

function getInitials(name: string) {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const { user } = useAuthStore();
  const { data: usersData, isLoading, isError, error, refetch } = useUsers({
    search: searchTerm || undefined,
  });
  const { data: roles } = useRoles();
  const resetPassword = useResetPassword();
  const deleteUserMutation = useDeleteUser();

  const handleDeleteUser = async (targetUser: any) => {
    if (!confirm(`Are you sure you want to remove team member "${targetUser.name}" (${targetUser.email})?`)) return;
    try {
      await deleteUserMutation.mutateAsync(targetUser.id);
    } catch (err: any) {
      alert(`Failed to delete user: ${err.message}`);
    }
  };

  // Plugins & Feature Toggles
  const { data: pluginSettings } = usePluginSettings();
  const togglePluginMutation = useTogglePlugin();

  const usersList: any[] = usersData || [];

  const filteredUsers = usersList.filter((u: any) => {
    if (filterBranch && !u.branches?.some((b: any) => b.code === filterBranch || b.name === filterBranch)) return false;
    if (filterRole && !u.roles?.some((r: any) => r.type === filterRole || r.name === filterRole)) return false;
    return true;
  });

  const handleResetPassword = async (targetUser: any) => {
    if (confirm(`Reset password for ${targetUser.name} (${targetUser.email})? A temporary password 'SVV@Reset2026' will be generated.`)) {
      try {
        await resetPassword.mutateAsync(targetUser.id);
        alert(`Password for ${targetUser.name} has been reset to: SVV@Reset2026`);
      } catch (err: any) {
        alert(err?.response?.data?.error || err?.message || 'Failed to reset password');
      }
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'users', label: 'Team & User Directory', icon: <Users className="w-4 h-4" /> },
    { key: 'roles', label: 'Roles & Permissions Matrix', icon: <Shield className="w-4 h-4" /> },
    { key: 'modules', label: 'Module Management (Plugins)', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
    { key: 'organization', label: 'Organization Profile', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 font-sans pb-10">
      <PageHeader
        title="System Administration & Team Directory"
        subtitle="Manage multi-branch team accounts, roles, access permissions, and organization profile."
        actions={
          activeTab === 'users' ? (
            <Button
              size="sm"
              className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold shadow-2xs h-9 px-4"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <UserPlus className="w-4 h-4 mr-1.5" /> Add Team Member
            </Button>
          ) : undefined
        }
      />

      {/* Tab navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-[#1e3a5f] text-[#1e3a5f] bg-blue-50/50 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ────────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl shadow-2xs border border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[260px] max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search by name, employee ID, email, designation..."
                  className="text-xs pl-9 h-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-9">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
              </Button>
            </div>
          </div>

          {/* User Directory Table */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="py-16 text-center">
                <LoadingSpinner size="md" />
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <p className="text-red-700 font-semibold text-sm">Failed to load user directory</p>
                <p className="text-red-500 text-xs">{(error as any)?.response?.data?.error || (error as any)?.message}</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Users className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-sm font-semibold text-gray-700">No users found matching your filters.</p>
                <p className="text-xs text-gray-400">Click "Add Team Member" to register an employee.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Employee ID</th>
                      <th className="py-3 px-4">Team Member</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Branch Access</th>
                      <th className="py-3 px-4">Reporting Manager</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((u: any) => {
                      const isMe = u.id === user?.sub;
                      const roleName = u.roleNames || u.roles?.[0]?.name || 'Staff';

                      return (
                        <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                          {/* Employee ID */}
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-700">
                            {u.employeeId || '—'}
                          </td>

                          {/* Member Card */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                {getInitials(u.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-gray-900 flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isMe && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold">YOU</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-500 truncate flex items-center gap-2 mt-0.5">
                                  <span>{u.email}</span>
                                  {u.phone && u.phone !== '—' && (
                                    <>
                                      <span>·</span>
                                      <span className="font-mono text-gray-400">{u.phone}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1e3a5f] border border-blue-200">
                              <Shield className="w-3 h-3 mr-1" />
                              {roleName}
                            </span>
                          </td>

                          {/* Designation */}
                          <td className="py-3.5 px-4 text-gray-800 font-medium">
                            {u.designation || 'Staff'}
                            {u.department && <div className="text-[10px] text-gray-400">{u.department}</div>}
                          </td>

                          {/* Assigned Branches */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1">
                              {u.branches && u.branches.length > 0 ? (
                                u.branches.map((b: any) => (
                                  <span
                                    key={b.id || b.code}
                                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    title={b.name}
                                  >
                                    {b.code || b.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 italic text-[11px]">All Branches</span>
                              )}
                            </div>
                          </td>

                          {/* Reporting Manager */}
                          <td className="py-3.5 px-4 text-gray-600">
                            {u.reportingManager ? (
                              <div className="font-medium text-gray-900">{u.reportingManager.name}</div>
                            ) : (
                              <span className="text-gray-400 italic">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {u.isOnLeave || u.status === 'ON_LEAVE' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                🌴 On Leave
                              </span>
                            ) : u.status === 'ACTIVE' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                {u.status}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] font-semibold text-[#1e3a5f] border-blue-200 hover:bg-blue-50"
                                onClick={() => setEditingUser(u)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px] text-gray-500 hover:text-blue-700"
                                title="Reset Password to Default"
                                onClick={() => handleResetPassword(u)}
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </Button>
                              {!isMe && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[11px] text-red-500 hover:text-red-700 hover:bg-red-50"
                                  title="Delete Team Member"
                                  onClick={() => handleDeleteUser(u)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ROLES & PERMISSIONS TAB ─────────────────────────────────────────── */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              role: 'SUPER_ADMIN',
              title: 'Super Administrator',
              color: 'bg-purple-50 text-purple-900 border-purple-200',
              description: 'Complete unrestricted control across all branches, users, system settings, database configurations, and audit policies.',
              count: usersList.filter(u => u.roles?.some((r: any) => r.type === 'SUPER_ADMIN')).length,
            },
            {
              role: 'ADMIN',
              title: 'Administrator',
              color: 'bg-blue-50 text-[#1e3a5f] border-blue-200',
              description: 'Organization-wide management of assets, work orders, tasks, budget limits, user directory, and compliance reports.',
              count: usersList.filter(u => u.roles?.some((r: any) => r.type === 'ADMIN')).length,
            },
            {
              role: 'BRANCH_MANAGER',
              title: 'Branch Manager',
              color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
              description: 'Operational lead for assigned branches. Manages local asset health, creates internal work tasks, approves ticket completions & expenditures.',
              count: usersList.filter(u => u.roles?.some((r: any) => r.type === 'BRANCH_MANAGER')).length,
            },
            {
              role: 'SUPERVISOR',
              title: 'Field / Shift Supervisor',
              color: 'bg-teal-50 text-teal-900 border-teal-200',
              description: 'Supervises branch floor operations, assigns tasks to staff, oversees PM schedules, and verifies shift checklists.',
              count: usersList.filter(u => u.roles?.some((r: any) => r.type === 'SUPERVISOR')).length,
            },
            {
              role: 'STAFF',
              title: 'Branch Staff / Operator',
              color: 'bg-slate-50 text-slate-800 border-slate-200',
              description: 'Branch end-user. Raises equipment breakdown tickets, executes assigned internal tasks, submits daily reports and checklist completions.',
              count: usersList.filter(u => u.roles?.some((r: any) => r.type === 'STAFF')).length,
            },
            {
              role: 'TECHNICIAN',
              title: 'Field Service Technician',
              color: 'bg-amber-50 text-amber-900 border-amber-200',
              description: 'Executes equipment repair work orders, records diagnosis & parts used, updates repair tickets via QR portal or mobile.',
              count: usersList.filter(u => u.roles?.some((r: any) => r.type === 'TECHNICIAN')).length,
            },
          ].map((item) => (
            <Card key={item.role} className="border border-gray-200 shadow-2xs hover:shadow-sm transition-shadow">
              <CardHeader className="py-3.5 px-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-900">
                    <Shield className="w-4 h-4 text-[#1e3a5f]" />
                    {item.title}
                  </CardTitle>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {item.count} User{item.count === 1 ? '' : 's'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 text-xs text-gray-600 leading-relaxed">
                {item.description}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── MODULE MANAGEMENT (PLUGINS) TAB ──────────────────────────────────── */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-[#1e3a5f] flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-gray-900">Plugin & Extension Architecture</h4>
              <p className="mt-0.5 text-gray-600 leading-relaxed">
                Enable or disable specialized business modules on-the-fly. When disabled, module routes, sidebar menus, and dashboard widgets remain hidden without altering existing core AMS database tables.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Module 1: Print & WhatsApp Service Hub */}
            <Card className="border border-gray-200 shadow-2xs overflow-hidden">
              <CardHeader className="py-4 border-b border-gray-100 bg-gray-50/60 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <span>Print & WhatsApp Service Hub</span>
                      {pluginSettings?.print_whatsapp_hub ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ● Enabled & Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                          ○ Disabled (Standby)
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-[11px] text-gray-500 mt-0.5">Automated WhatsApp Document Orders, Kiosk Print Queue, Tokens, Ads & Print Analytics</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    loading={togglePluginMutation.isPending}
                    onClick={() => togglePluginMutation.mutate({
                      key: 'print_whatsapp_hub',
                      isEnabled: !pluginSettings?.print_whatsapp_hub,
                    })}
                    className={`text-xs font-bold px-4 h-9 shadow-xs transition-all ${
                      pluginSettings?.print_whatsapp_hub
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {pluginSettings?.print_whatsapp_hub ? 'Disable Module' : 'Enable Module'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <span className="font-bold text-gray-800 block text-xs">💬 WhatsApp Print Bot</span>
                    <p className="text-[11px] text-gray-500">Customers send PDF/Word documents to branch WhatsApp numbers for immediate token queueing.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <span className="font-bold text-gray-800 block text-xs">🎫 Digital Token Board</span>
                    <p className="text-[11px] text-gray-500">Fullscreen TV waiting screen with large animated numbers for customer order collection.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <span className="font-bold text-gray-800 block text-xs">📢 Digital Signage Ads</span>
                    <p className="text-[11px] text-gray-500">Display timed promotional banners and local advertisements on customer self-service kiosks.</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-200 flex items-center justify-between text-[11px] text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <strong>Sub-menu Scope:</strong> WhatsApp Inbox, Print Queue, Self Service, Customer Tokens, Ads, Branch QR, Analytics.
                  </span>
                  <span className="text-gray-400">Plugin ID: <code>print_whatsapp_hub</code></span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── ORGANIZATION TAB ────────────────────────────────────────────────── */}
      {activeTab === 'organization' && (
        <Card className="border border-gray-200 shadow-2xs">
          <CardHeader className="py-4 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-900">Organization Master Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-gray-400 font-semibold text-[10px] uppercase">Organization Name</p>
                <p className="font-bold text-sm text-gray-900 mt-1">{user?.orgName || 'SVV Communication'}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-gray-400 font-semibold text-[10px] uppercase">System Architecture</p>
                <p className="font-bold text-sm text-gray-900 mt-1">Multi-Branch SaaS AMS</p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-gray-400 font-semibold text-[10px] uppercase">Default Currency</p>
                <p className="font-bold text-sm text-gray-900 mt-1">INR (₹)</p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-gray-400 font-semibold text-[10px] uppercase">Timezone</p>
                <p className="font-bold text-sm text-gray-900 mt-1">Asia/Kolkata (IST)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit User Modal */}
      {(editingUser || isCreateModalOpen) && (
        <EditUserModal
          user={editingUser}
          onClose={() => {
            setEditingUser(null);
            setIsCreateModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
