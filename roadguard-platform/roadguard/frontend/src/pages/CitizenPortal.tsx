import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Complaint } from '../types';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Wrench, 
  ShieldCheck, 
  ArrowRight, 
  FileText,
  User,
  PlusCircle,
  Eye,
  Calendar
} from 'lucide-react';

export const CitizenPortal: React.FC = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getMyComplaints();
        setComplaints(data);
      } catch (err) {
        console.error('Failed to load user complaints', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Submitted':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'Assigned':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'In Progress':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'Repair Completed':
      case 'Closed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Rejected':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Welcome Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono uppercase text-sky-400 tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4" /> Citizen Dashboard
              </span>
              <span className="bg-slate-800 border border-slate-700 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-mono">
                Active Resident
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white mt-1">
              Welcome, {user?.full_name || 'Citizen'}
            </h1>
            <p className="text-xs text-slate-400">
              {user?.department || 'Civilian Resident'} &mdash; {user?.email}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/report"
              className="flex items-center space-x-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-lg"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report New Distress</span>
            </Link>
            <Link
              to="/map"
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl transition border border-slate-700"
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Network Map</span>
            </Link>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
              <span>Total Reports Lodged</span>
              <FileText className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-extrabold text-white mt-2 font-mono">{complaints.length}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
              <span>Under Repair / In Progress</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-extrabold text-white mt-2 font-mono">
              {complaints.filter(c => ['Submitted', 'Assigned', 'In Progress'].includes(c.status)).length}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
              <span>Restored & Verified</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-extrabold text-white mt-2 font-mono">
              {complaints.filter(c => ['Repair Completed', 'Closed'].includes(c.status)).length}
            </p>
          </div>
        </div>

        {/* Complaints History Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>My Submitted Grievances</span>
              </h2>
              <p className="text-xs text-slate-400">Track lifecycle stage from submission to contractor post-repair verification</p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-mono">Retrieving your grievances...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-3">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm">You have not submitted any road damage complaints yet.</p>
              <Link
                to="/report"
                className="inline-flex items-center space-x-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold"
              >
                <span>Lodge your first report</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {complaints.map((c) => (
                <div key={c.id} className="p-5 hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <img
                      src={c.annotated_image_url || c.image_url}
                      alt="Defect"
                      className="w-16 h-14 object-cover rounded-xl border border-slate-700 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-sky-400 text-sm">{c.reference_no}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(c.status)}`}>
                          {c.status}
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                          {c.priority_tier}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white">{c.address || c.road_name || 'Unmapped corridor'}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-md">{c.description || 'No description provided.'}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{c.responsible_authority || 'Routing Pending'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{new Date(c.created_at).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 sm:self-center">
                    <Link
                      to={`/track?ref=${encodeURIComponent(c.reference_no)}`}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-sky-300 rounded-lg transition border border-slate-700"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Track Progress</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
