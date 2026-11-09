import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Complaint, DashboardStats, MaintenanceTask } from '../types';
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Wrench, 
  Building2, 
  ShieldAlert, 
  Eye, 
  Send, 
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';

export const AuthorityDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Assignment Modal
  const [assignModalComplaint, setAssignModalComplaint] = useState<Complaint | null>(null);
  const [contractorAuthority, setContractorAuthority] = useState<string>('Sri Sai Pavement Works & Asphalt Contractors');
  const [instructions, setInstructions] = useState<string>('Perform cold milling and full-depth asphalt patching within 48 hours.');
  const [assigning, setAssigning] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overview, list] = await Promise.all([
        api.getDashboardOverview(),
        api.listComplaints()
      ]);
      setStats(overview);
      setComplaints(list);
    } catch (err) {
      console.error('Failed to load authority dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalComplaint) return;
    setAssigning(true);
    try {
      await api.assignTask({
        complaint_id: assignModalComplaint.id,
        assigned_authority: contractorAuthority,
        priority_level: assignModalComplaint.priority_tier,
        work_instructions: instructions
      });
      setAssignModalComplaint(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Task assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleReject = async (complaintId: string) => {
    const reason = prompt('Please specify reason for rejecting / returning this grievance:');
    if (!reason) return;
    try {
      await api.updateComplaintStatus(complaintId, 'Rejected', reason);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono uppercase text-sky-400 tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> Operations Command Center
              </span>
              <span className="bg-slate-800 border border-slate-700 text-sky-300 text-[10px] px-2 py-0.5 rounded font-mono">
                Jurisdiction Scoped
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white mt-1">Infrastructure Authority Dashboard</h1>
            <p className="text-xs text-slate-400">
              Logged in as: <strong className="text-white">{user?.full_name || 'Authority Officer'}</strong> ({user?.role.replace('_', ' ')}) &mdash; {user?.department || 'Civil Works'}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/maintenance"
              className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow"
            >
              <Wrench className="w-4 h-4" />
              <span>Active Work Orders</span>
            </Link>

            <Link
              to="/map"
              className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>GIS GIS Corridor View</span>
            </Link>
          </div>
        </div>

        {/* Telemetry Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Reports</span>
            <p className="text-2xl font-black text-white font-mono mt-1">{stats?.total_complaints ?? 0}</p>
            <p className="text-[10px] text-slate-500">Across active testbed</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[10px] text-amber-400 uppercase font-semibold">Pending Review</span>
            <p className="text-2xl font-black text-amber-400 font-mono mt-1">{stats?.unreviewed_complaints ?? 0}</p>
            <p className="text-[10px] text-slate-500">Awaiting triage/dispatch</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[10px] text-red-400 uppercase font-semibold">Critical Dispatches</span>
            <p className="text-2xl font-black text-red-400 font-mono mt-1">{stats?.critical_dispatches ?? 0}</p>
            <p className="text-[10px] text-slate-500">MPS &ge; 70 (Urgent 24h SLA)</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[10px] text-sky-400 uppercase font-semibold">In Progress Repairs</span>
            <p className="text-2xl font-black text-sky-400 font-mono mt-1">{stats?.in_progress_tasks ?? 0}</p>
            <p className="text-[10px] text-slate-500">Assigned to contractors</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[10px] text-emerald-400 uppercase font-semibold">Network PCI Score</span>
            <p className="text-2xl font-black text-emerald-400 font-mono mt-1">{stats?.avg_pci_network ?? 85.0}</p>
            <p className="text-[10px] text-slate-500">ASTM D6433 Standard</p>
          </div>

        </div>

        {/* Complaints Review & Triage Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          
          <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span>Grievance Triage & Inspection Review Queue</span>
              </h2>
              <p className="text-xs text-slate-400">
                Incoming citizen and field survey reports snapped to this agency. Validate AI predictions and issue work orders.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              {['ALL', 'Submitted', 'Assigned', 'In Progress', 'Repair Completed', 'Closed'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-lg font-mono transition ${
                    statusFilter === s ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Ref Code / Date</th>
                  <th className="py-3 px-4">Distress Photo & XAI</th>
                  <th className="py-3 px-4">Road Corridor & Authority</th>
                  <th className="py-3 px-4">Severity & PCI</th>
                  <th className="py-3 px-4">Priority (MPS)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No complaints found matching this filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition">
                      
                      <td className="py-3 px-4 font-mono">
                        <Link to={`/track?ref=${c.reference_no}`} className="font-bold text-sky-400 hover:underline">
                          {c.reference_no}
                        </Link>
                        <p className="text-[10px] text-slate-500">{new Date(c.created_at).toLocaleDateString()}</p>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <img
                            src={c.annotated_image_url || c.image_url}
                            alt="Damage"
                            className="w-14 h-10 object-cover rounded border border-slate-700"
                          />
                          {c.xai_heatmap_url && (
                            <img
                              src={c.xai_heatmap_url}
                              alt="XAI"
                              className="w-14 h-10 object-cover rounded border border-indigo-700/50"
                              title="XAI Saliency"
                            />
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-[200px]">
                        <p className="font-semibold text-white truncate">{c.road_name || 'Unmapped Road'}</p>
                        <p className="text-[11px] text-slate-400 truncate">{c.responsible_authority || 'Pending'}</p>
                        <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                          {c.road_hierarchy || 'Urban'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          c.severity_level === 'Critical' ? 'bg-red-500/20 text-red-400' :
                          c.severity_level === 'High' ? 'bg-orange-500/20 text-orange-400' :
                          c.severity_level === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {c.severity_level} ({(c.peak_severity * 100).toFixed(0)}%)
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">PCI: {c.pci_score}</p>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          c.priority_tier === 'CRITICAL_DISPATCH' ? 'bg-red-500 text-white' :
                          c.priority_tier === 'SCHEDULED_REPAIR' ? 'bg-amber-600 text-white' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {c.priority_tier}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">Score: {c.priority_score}</p>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold text-slate-300 font-mono">
                          {c.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right space-x-2">
                        {c.status === 'Submitted' && (
                          <>
                            <button
                              onClick={() => setAssignModalComplaint(c)}
                              className="bg-sky-600 hover:bg-sky-500 text-white px-2.5 py-1 rounded text-xs font-semibold shadow transition"
                            >
                              Dispatch Task
                            </button>
                            <button
                              onClick={() => handleReject(c.id)}
                              className="bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 px-2 py-1 rounded text-xs transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <Link
                          to={`/track?ref=${c.reference_no}`}
                          className="text-slate-400 hover:text-white p-1 inline-block"
                          title="Inspect details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Task Assignment Modal */}
        {assignModalComplaint && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-sky-400" />
                  <span>Dispatch Work Order &mdash; {assignModalComplaint.reference_no}</span>
                </h3>
                <button
                  onClick={() => setAssignModalComplaint(null)}
                  className="text-slate-400 hover:text-white"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleAssignTask} className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-400 uppercase font-semibold">Assign Maintenance Contractor</label>
                  <input
                    type="text"
                    value={contractorAuthority}
                    onChange={(e) => setContractorAuthority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white mt-1"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-400 uppercase font-semibold">Work Order Directives</label>
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white mt-1"
                    required
                  />
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <p className="text-slate-300 font-semibold">{assignModalComplaint.road_name}</p>
                  <p className="text-slate-400">Severity: {assignModalComplaint.severity_level} | Priority: {assignModalComplaint.priority_tier}</p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAssignModalComplaint(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assigning}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow disabled:opacity-50"
                  >
                    {assigning ? 'Dispatching...' : 'Confirm Work Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
