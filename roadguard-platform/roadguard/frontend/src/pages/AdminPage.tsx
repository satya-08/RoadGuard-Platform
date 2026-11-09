import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { 
  ShieldAlert, 
  Cpu, 
  HardDrive, 
  Users, 
  FileText, 
  Send, 
  AlertCircle, 
  CheckCircle,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock Government Gateway Dispatch State
  const [mockPortal, setMockPortal] = useState('CPGRAMS');
  const [mockRoadName, setMockRoadName] = useState('NH-16 Tadepalligudem Bypass');
  const [mockDefect, setMockDefect] = useState('High severity longitudinal fracture cluster');
  const [mockDispatchResult, setMockDispatchResult] = useState<any>(null);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getSystemHealth(),
      api.listUsers(),
      api.getAuditLogs()
    ])
      .then(([h, u, a]) => {
        setHealth(h);
        setUsers(u);
        setAuditLogs(a);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load admin telemetry', err);
        setLoading(false);
      });
  }, []);

  const handleMockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatching(true);
    try {
      const res = await api.mockGovSubmit({
        internal_complaint_id: 'test-case-demo-1234',
        target_portal: mockPortal,
        road_name: mockRoadName,
        defect_description: mockDefect,
        latitude: 16.8260,
        longitude: 81.5210
      });
      setMockDispatchResult(res);
    } catch (err: any) {
      alert(err.message || 'Mock dispatch failed');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <span className="text-xs font-mono uppercase text-red-400 tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> Root System Administration
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-1">System Health, Users & Audit Logs</h1>
            <p className="text-xs text-slate-400">
              Host hardware diagnostics, YOLO perception engine status, user access control, and mock government integrations.
            </p>
          </div>
        </div>

        {/* System Health Telemetry */}
        {health && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <span className="text-xs font-mono uppercase text-sky-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4" /> Host Resources
              </span>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">CPU Load:</span>
                  <span className="text-white font-bold">{health.system_telemetry?.cpu_usage_percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">RAM In Use:</span>
                  <span className="text-white font-bold">{health.system_telemetry?.ram_usage_percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Available RAM:</span>
                  <span className="text-white font-bold">{health.system_telemetry?.ram_available_gb} GB</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <span className="text-xs font-mono uppercase text-indigo-400 flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> AI Model Engine
              </span>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Model:</span>
                  <span className="text-emerald-400 font-bold">YOLOv8s Custom</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-emerald-400 font-bold">{health.ai_model?.loaded ? 'Loaded & Active' : 'Fallback Engine'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Classes:</span>
                  <span className="text-white font-bold">Pothole, Crack, Manhole</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <span className="text-xs font-mono uppercase text-emerald-400 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4" /> Relational Database
              </span>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Engine:</span>
                  <span className="text-white font-bold">SQLite / MySQL 8</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Storage:</span>
                  <span className="text-white font-bold">{health.system_telemetry?.uploads_storage_mb} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-emerald-400 font-bold">{health.status}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <span className="text-xs font-mono uppercase text-amber-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> MongoDB Dual-DB
              </span>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className={`font-bold ${health.mongodb?.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {health.mongodb?.connected ? 'Online (Atlas M0)' : 'Relational Fallback'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Database:</span>
                  <span className="text-white font-bold">{health.mongodb?.database_name || 'roadguard_logs'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Audit Sync:</span>
                  <span className="text-sky-400 font-bold">{health.mongodb?.connected ? 'Active Stream' : 'SQL Standby'}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Section 5: Mock Government Integration Demonstrator */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-400" />
                <span>Mock Government System Integration (Adapter Pattern &mdash; Case C Demo)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Demonstrates dispatch of internal maintenance records to external government portals (e.g. CPGRAMS / NHAI Rah-Bharosa).
              </p>
            </div>
            <span className="bg-purple-500/10 text-purple-400 text-[10px] font-mono px-2 py-0.5 rounded border border-purple-500/30">
              Demonstration Mode
            </span>
          </div>

          <form onSubmit={handleMockSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="text-slate-400 uppercase font-semibold">Target External Portal</label>
              <select
                value={mockPortal}
                onChange={(e) => setMockPortal(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white mt-1"
              >
                <option value="CPGRAMS">CPGRAMS (Central Grievance)</option>
                <option value="NHAI_RAH_BHAROSA">NHAI Rah-Bharosa Portal</option>
                <option value="ANDHRA_SPANDANA">AP Spandana Grievance ERP</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 uppercase font-semibold">Surveyed Road Name</label>
              <input
                type="text"
                value={mockRoadName}
                onChange={(e) => setMockRoadName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white mt-1"
              />
            </div>

            <div>
              <label className="text-slate-400 uppercase font-semibold">Defect Description</label>
              <input
                type="text"
                value={mockDefect}
                onChange={(e) => setMockDefect(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white mt-1"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={dispatching}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-lg shadow transition disabled:opacity-50"
              >
                {dispatching ? 'Dispatching...' : 'Dispatch to Gateway'}
              </button>
            </div>
          </form>

          {mockDispatchResult && (
            <div className="p-4 bg-purple-950/40 border border-purple-800/60 rounded-xl space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-purple-300 font-bold">
                <CheckCircle className="w-4 h-4" />
                <span>Simulated Government Transmission Succeeded</span>
              </div>
              <p className="text-slate-300 font-mono">
                Mock Reference Code: <strong className="text-white">{mockDispatchResult.mock_reference_number}</strong>
              </p>
              <div className="p-2.5 bg-slate-950 border border-purple-900 rounded text-[11px] text-amber-300 font-mono">
                <strong>ACADEMIC DISCLAIMER:</strong> {mockDispatchResult.demonstration_disclaimer}
              </div>
            </div>
          )}
        </div>

        {/* User Account Access Management */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              <span>Registered Accounts & Role Access Control</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">{users.length} Registered Accounts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">System Role</th>
                  <th className="py-2.5 px-3">Department / Ward</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-white">{u.full_name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-slate-800 text-sky-300 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono uppercase">
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{u.department || 'General'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={async () => {
                          try {
                            await api.toggleUserStatus(u.id, !u.is_active);
                            const updatedUsers = await api.listUsers();
                            setUsers(updatedUsers);
                          } catch (err: any) {
                            alert(err.message || 'Failed to update user status');
                          }
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                          u.is_active ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Trail & Activity Logs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Immutable System Audit Trail</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Recent Operations</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor Email</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {auditLogs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-white font-medium">{log.user_email || 'System'}</td>
                    <td className="py-2.5 px-3 font-mono text-sky-400">{log.action}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{log.entity_type}</td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
