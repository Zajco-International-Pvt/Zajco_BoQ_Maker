import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Settings, 
  History, 
  ShieldCheck, 
  Building, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Lock, 
  RefreshCw
} from 'lucide-react';
import type { UserProfile, SystemSettings, AuditLog } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getAllUsers, updateUserRoleAndStatus, updateSystemSettings, getAuditLogs } from '../../services/adminService';

interface AdminPanelProps {
  settings: SystemSettings;
  onSettingsUpdated: (newSettings: SystemSettings) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ settings, onSettingsUpdated }) => {
  const { userProfile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'audit'>('users');

  // Users State
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Settings Form State
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [saveLoading, setSaveLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    loadUsers();
    loadAuditLogs();
  }, []);

  const loadUsers = async () => {
    try {
      const list = await getAllUsers();
      setUsers(list);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const logs = await getAuditLogs(100);
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle user role or status
  const handleUserUpdate = async (uid: string, currentRole: 'ADMIN' | 'USER', currentStatus: 'ACTIVE' | 'DISABLED', targetType: 'role' | 'status') => {
    if (!userProfile) return;
    try {
      const newRole = targetType === 'role' ? (currentRole === 'ADMIN' ? 'USER' : 'ADMIN') : currentRole;
      const newStatus = targetType === 'status' ? (currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE') : currentStatus;
      await updateUserRoleAndStatus(uid, newRole, newStatus, userProfile);
      await loadUsers();
    } catch (err: any) {
      alert('Failed to update user: ' + err.message);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setSaveLoading(true);
    setNotice(null);
    try {
      await updateSystemSettings(formData, userProfile);
      onSettingsUpdated(formData);
      setNotice({ type: 'success', message: 'Global System Settings & Exchange Rates updated!' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to save settings.' });
    } finally {
      setSaveLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-4">
        <Lock className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Access Restricted</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          You do not have Administrator permissions to access the Admin Panel. Please contact a ZAJCO system administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header Tabs */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            <span>Admin Control Panel</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            User permissions, global exchange rates, company branding, and security audit logs
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'audit' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Logs</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between gap-3 ${
          notice.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center space-x-3 text-xs sm:text-sm min-w-0">
            {notice.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />}
            <span className="break-words">{notice.message}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-xs underline font-semibold flex-shrink-0">Dismiss</button>
        </div>
      )}

      {/* TAB 1: User Management */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Registered User Accounts</span>
            </h2>
            <button
              onClick={loadUsers}
              className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-300 font-bold uppercase">
                <tr>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Company</th>
                  <th className="p-3.5 text-center">Role</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 font-mono">Last Login</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {users.map(u => (
                  <tr key={u.uid} className="hover:bg-slate-800/40">
                    <td className="p-3.5 font-semibold text-white">{u.name}</td>
                    <td className="p-3.5 text-slate-300 font-mono">{u.email}</td>
                    <td className="p-3.5 text-slate-400">{u.company || 'ZAJCO'}</td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '-'}
                    </td>
                    <td className="p-3.5 text-center space-x-2">
                      <button
                        onClick={() => handleUserUpdate(u.uid, u.role, u.status, 'role')}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded text-slate-200"
                      >
                        Toggle Role ({u.role === 'ADMIN' ? 'Set USER' : 'Set ADMIN'})
                      </button>
                      <button
                        onClick={() => handleUserUpdate(u.uid, u.role, u.status, 'status')}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded text-slate-200"
                      >
                        {u.status === 'ACTIVE' ? 'Disable Account' : 'Enable Account'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: System Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl space-y-5 sm:space-y-6">
          <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
              <Building className="w-5 h-5 text-blue-400" />
              <span>Global Enterprise Configuration</span>
            </h2>
            <button
              type="submit"
              disabled={saveLoading}
              className="flex items-center justify-center space-x-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 w-full sm:w-auto"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">VAT / Tax ID Number</label>
              <input
                type="text"
                value={formData.vatNumber}
                onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-300 mb-1">
                Default EUR to SAR Conversion Rate
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.eurToSarRate}
                onChange={(e) => setFormData({ ...formData, eurToSarRate: parseFloat(e.target.value) || 5 })}
                className="w-full bg-slate-950 border border-amber-500/60 text-amber-300 font-bold rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Default Profit Percentage %</label>
              <input
                type="number"
                step="0.1"
                value={formData.defaultProfitPercentage}
                onChange={(e) => setFormData({ ...formData, defaultProfitPercentage: parseFloat(e.target.value) || 15 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">BOQ Number Format Template</label>
              <input
                type="text"
                value={formData.boqNumberFormat}
                onChange={(e) => setFormData({ ...formData, boqNumberFormat: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company Address</label>
              <input
                type="text"
                value={formData.companyAddress}
                onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <History className="w-4 h-4 text-blue-400" />
              <span>System Activity Audit Trail</span>
            </h2>
            <button
              onClick={loadAuditLogs}
              className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-300 font-bold uppercase sticky top-0">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">BOQ Number</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/40 font-mono">
                    <td className="p-3 text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-blue-300">{log.userName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{log.boqNumber || '-'}</td>
                    <td className="p-3 text-slate-400 max-w-sm truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
