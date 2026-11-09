import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  MapPin, 
  Cpu, 
  Activity, 
  Wrench, 
  Building2, 
  ArrowRight, 
  CheckCircle2, 
  Award,
  Sparkles,
  Layers,
  FileSearch
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DashboardStats } from '../types';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.getDashboardOverview()
      .then(setStats)
      .catch((err) => console.log('Landing stats preview', err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      
      {/* ─── Hero Section ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/30 via-slate-950 to-slate-950"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Road<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Guard</span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 font-light leading-relaxed">
                An <span className="text-sky-300 font-medium">Explainable Deep Learning-Based Road Damage Assessment</span> and <span className="text-indigo-300 font-medium">Intelligent Maintenance Prioritization System</span> bridging visual perception with municipal governance.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                {(!user || user.role === 'citizen') ? (
                  <Link
                    to="/report"
                    className="flex items-center space-x-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02]"
                  >
                    <ShieldAlert className="w-5 h-5" />
                    <span>Report Road Distress</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                ) : (
                  <Link
                    to={user.role === 'admin' ? '/admin' : user.role === 'maintenance_contractor' ? '/maintenance' : user.role === 'field_inspector' ? '/inspection' : '/authority'}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02]"
                  >
                    <Building2 className="w-5 h-5" />
                    <span>Open {user.role === 'admin' ? 'Admin Diagnostics' : user.role === 'maintenance_contractor' ? 'Work Orders' : user.role === 'field_inspector' ? 'Field Inspection & CRT Check' : 'Authority Queue'}</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                )}

                <Link
                  to="/map"
                  className="flex items-center space-x-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-semibold px-6 py-3.5 rounded-xl transition hover:scale-[1.02]"
                >
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  <span>Interactive Network Map</span>
                </Link>

                <Link
                  to="/track"
                  className="flex items-center space-x-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-medium px-4 py-3.5 rounded-xl transition"
                >
                  <FileSearch className="w-4 h-4 text-sky-400" />
                  <span>Track Complaint</span>
                </Link>
              </div>

              {/* Research Pillars */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
                <Link to="/map" className="group block hover:opacity-90 transition">
                  <p className="text-2xl font-bold text-sky-400 font-mono group-hover:text-sky-300">84.9%</p>
                  <p className="text-xs text-slate-400 group-hover:text-slate-300">mAP@50 YOLOv8s Model</p>
                </Link>
                <Link to="/map" className="group block hover:opacity-90 transition">
                  <p className="text-2xl font-bold text-indigo-400 font-mono group-hover:text-indigo-300">ASTM D6433</p>
                  <p className="text-xs text-slate-400 group-hover:text-slate-300">Pavement Condition Index</p>
                </Link>
                <Link to="/map" className="group block hover:opacity-90 transition">
                  <p className="text-2xl font-bold text-emerald-400 font-mono group-hover:text-emerald-300">3 Jurisdictions</p>
                  <p className="text-xs text-slate-400 group-hover:text-slate-300">NHAI / AP PWD / Municipal</p>
                </Link>
              </div>
            </div>

            {/* Architecture Card */}
            <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <span className="text-xs font-mono uppercase text-sky-400 tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Live Operational Corridor
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Online
                </span>
              </div>

              <div className="space-y-3 pt-3 text-sm">
                <Link
                  to="/vision"
                  className="flex items-start space-x-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-sky-500/60 hover:bg-slate-900/80 transition-all hover:scale-[1.01] cursor-pointer group block"
                  title="Explore real-time YOLOv8 Computer Vision detection & CLAHE normalization"
                >
                  <Cpu className="w-5 h-5 text-sky-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-200 group-hover:text-white transition">1. Real YOLOv8 Computer Vision</p>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-1 transition" />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Pothole (D40), Surface Cracks, & Open Manholes with CLAHE glare normalization.</p>
                  </div>
                </Link>

                <Link
                  to="/xai"
                  className="flex items-start space-x-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-900/80 transition-all hover:scale-[1.01] cursor-pointer group block"
                  title="Explore Explainable AI (XAI) Saliency Heatmaps & Engineering Audit"
                >
                  <Layers className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-200 group-hover:text-white transition">2. Explainable AI (XAI) Saliency</p>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Gradient-texture & Laplacian frequency energy maps for engineering audit justification.</p>
                  </div>
                </Link>

                <Link
                  to="/map"
                  className="flex items-start space-x-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-purple-500/60 hover:bg-slate-900/80 transition-all hover:scale-[1.01] cursor-pointer group block"
                  title="Open Interactive GIS Corridor Network Map"
                >
                  <Building2 className="w-5 h-5 text-purple-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-200 group-hover:text-white transition">3. Autonomous Jurisdiction Routing</p>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition" />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Snaps GPS to NH-16, State Highways, and Municipal Wards with ambiguity fallbacks.</p>
                  </div>
                </Link>

                <Link
                  to={user ? (user.role === 'maintenance_contractor' ? '/maintenance' : ['nhai_authority', 'state_highway_authority', 'municipal_authority', 'field_inspector', 'admin'].includes(user.role) ? '/inspection' : '/track') : '/track'}
                  className="flex items-start space-x-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-amber-500/60 hover:bg-slate-900/80 transition-all hover:scale-[1.01] cursor-pointer group block"
                  title="Open Post-Repair AI Verification & Work Orders"
                >
                  <Wrench className="w-5 h-5 text-amber-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-200 group-hover:text-white transition">4. Post-Repair AI Verification</p>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition" />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Automated before-and-after defect verification before formal ticket closure.</p>
                  </div>
                </Link>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ─── Real-Time Telemetry Counters ────────────────────────────── */}
      <section className="py-10 bg-slate-900/60 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <p className="text-3xl font-extrabold text-white font-mono">{stats?.total_complaints ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Total Damage Reports</p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <p className="text-3xl font-extrabold text-red-400 font-mono">{stats?.critical_dispatches ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Critical Dispatches (MPS &gt; 70)</p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <p className="text-3xl font-extrabold text-sky-400 font-mono">{stats?.monitored_segments ?? 4}</p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Monitored Corridors</p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <p className="text-3xl font-extrabold text-emerald-400 font-mono">{stats?.avg_pci_network ?? 85.0}</p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Avg. Network PCI Health</p>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};
