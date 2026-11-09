import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Complaint } from '../types';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  MapPin, 
  Wrench, 
  Layers, 
  ShieldCheck,
  FileText
} from 'lucide-react';

export const ComplaintTrackingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [refInput, setRefInput] = useState<string>(searchParams.get('ref') || '');
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    'Submitted',
    'AI Analyzed',
    'Pending Review',
    'Assigned',
    'In Progress',
    'Repair Completed',
    'Closed'
  ];

  const handleSearch = async (targetRef?: string) => {
    const queryRef = targetRef || refInput.trim();
    if (!queryRef) return;

    setError(null);
    setLoading(true);
    try {
      const data = await api.trackComplaint(queryRef);
      setComplaint(data);
    } catch (err: any) {
      setError(err.message || 'No complaint found matching this reference code.');
      setComplaint(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialRef = searchParams.get('ref');
    if (initialRef) {
      setRefInput(initialRef);
      handleSearch(initialRef);
    }
  }, [searchParams]);

  const getStepStatus = (stepName: string) => {
    if (!complaint) return 'upcoming';
    const curr = complaint.status;
    const currIdx = steps.indexOf(curr);
    const stepIdx = steps.indexOf(stepName);

    if (curr === 'Closed') return 'completed';
    if (curr === 'Rejected') return stepName === 'Submitted' ? 'completed' : 'rejected';
    if (stepIdx < currIdx || (currIdx === -1 && stepIdx === 0)) return 'completed';
    if (stepIdx === currIdx) return 'current';
    return 'upcoming';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header & Search Bar */}
        <div className="text-center space-y-3">
          <span className="text-xs font-mono uppercase text-sky-400 tracking-wider flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Public Citizen Redressal Portal
          </span>
          <h1 className="text-3xl font-extrabold text-white">Track Grievance Resolution</h1>
          <p className="text-xs text-slate-400 max-w-xl mx-auto">
            Enter your unique RoadGuard reference code to inspect real-time inspection, contractor assignment, and AI post-repair verification status.
          </p>

          <div className="pt-2 max-w-md mx-auto flex gap-2">
            <input
              type="text"
              placeholder="e.g. RG-261018-ABCD"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-5 py-2.5 rounded-xl transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Searching...' : 'Track'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Complaint Detailed Status View */}
        {complaint && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-6 p-6 sm:p-8">
            
            {/* Top Bar: Reference & Status Pill */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400">Reference Number</span>
                <p className="text-2xl font-black text-sky-400 font-mono tracking-wider">{complaint.reference_no}</p>
                <p className="text-xs text-slate-400">Lodge Date: {new Date(complaint.created_at).toLocaleDateString()}</p>
              </div>

              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider font-mono ${
                  complaint.status === 'Closed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  complaint.status === 'In Progress' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  complaint.status === 'Rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                }`}>
                  {complaint.status}
                </span>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Priority: <span className="font-semibold text-white">{complaint.priority_tier}</span>
                </p>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="py-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Lifecycle Progression</p>
              <div className="flex flex-col sm:flex-row justify-between relative gap-2 sm:gap-0">
                {steps.map((st, idx) => {
                  const state = getStepStatus(st);
                  return (
                    <div key={st} className="flex sm:flex-col items-center gap-2 sm:gap-1 text-left sm:text-center relative z-10 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors ${
                        state === 'completed' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                        state === 'current' ? 'bg-sky-500 text-white animate-pulse' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {idx + 1}
                      </div>
                      <span className={`text-[11px] font-medium ${
                        state === 'completed' ? 'text-emerald-400' :
                        state === 'current' ? 'text-sky-300 font-bold' :
                        'text-slate-500'
                      }`}>
                        {st}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Key Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" /> Matched Corridor
                </span>
                <p className="text-sm font-bold text-white">{complaint.road_name || 'Unmapped Local Road'}</p>
                <p className="text-xs text-slate-400">Class: {complaint.road_hierarchy || 'Urban'}</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Authorized Jurisdiction
                </span>
                <p className="text-sm font-bold text-white">{complaint.responsible_authority || 'Local Collectorate'}</p>
                <p className="text-xs text-slate-400">{complaint.division || 'General Public Works'}</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-400" /> Physical Condition
                </span>
                <p className="text-sm font-bold text-white">PCI: {complaint.pci_score} / 100</p>
                <p className="text-xs text-slate-400">Severity: {complaint.severity_level} ({(complaint.peak_severity * 100).toFixed(0)}%)</p>
              </div>

            </div>

            {/* Visual Evidence Section */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Visual Inspection Evidence
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-mono text-slate-400 mb-1">Optical Inspection Detection</p>
                  <img
                    src={complaint.annotated_image_url || complaint.image_url}
                    alt="Original damage"
                    className="w-full h-48 object-cover rounded-xl border border-slate-800"
                  />
                </div>

                {complaint.xai_heatmap_url ? (
                  <div>
                    <p className="text-[11px] font-mono text-indigo-400 mb-1">Explainable AI Saliency Heatmap</p>
                    <img
                      src={complaint.xai_heatmap_url}
                      alt="XAI Saliency"
                      className="w-full h-48 object-cover rounded-xl border border-indigo-900/50"
                    />
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-500">
                    Awaiting repair verification photo upload...
                  </div>
                )}
              </div>
            </div>

            {complaint.rejection_reason && (
              <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-300">
                <strong>Reason for Rejection / Return:</strong> {complaint.rejection_reason}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
