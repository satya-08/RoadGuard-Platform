import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Complaint } from '../types';
import { 
  Camera, 
  MapPin, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  XCircle, 
  ArrowRight, 
  RefreshCw,
  Building2,
  FileCheck2,
  Send,
  PauseCircle,
  Eye,
  Filter,
  Search,
  ExternalLink,
  Layers,
  ChevronRight,
  Shield,
  HelpCircle
} from 'lucide-react';

const AUTHORITY_OPTIONS = [
  { value: 'All Authorities (Joint: NHAI, State PWD, Municipality)', label: 'All Authorities (Joint Jurisdiction: NHAI, AP PWD & Municipality)', short: 'All Authorities' },
  { value: 'National Highways Authority of India (NHAI)', label: 'National Highways Authority of India (NHAI)', short: 'NHAI' },
  { value: 'Andhra Pradesh State PWD (Roads & Buildings)', label: 'Andhra Pradesh State PWD (Roads & Buildings)', short: 'State PWD' },
  { value: 'Tadepalligudem Municipal Corporation', label: 'Tadepalligudem Municipal Corporation', short: 'Municipality' },
];

export const FieldInspectionPage: React.FC = () => {
  const { user } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'uploaded_data' | 'live_check'>('uploaded_data');

  // ─── TAB 1: ALL UPLOADED DATA STATE ────────────────────────────────
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState<boolean>(true);
  const [targetAuthorities, setTargetAuthorities] = useState<{ [id: string]: string }>({});
  const [actionLoading, setActionLoading] = useState<{ [id: string]: boolean }>({});
  const [feedback, setFeedback] = useState<{ id?: string; type: 'success' | 'error'; message: string } | null>(null);

  // Filters for Uploaded Data
  const [filterAuthority, setFilterAuthority] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ─── TAB 2: LIVE FIELD INSPECTION STATE ───────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number>(16.8260);
  const [longitude, setLongitude] = useState<number>(81.5210);
  const [notes, setNotes] = useState<string>('Field survey quality inspection & defect verification.');
  const [loadingCheck, setLoadingCheck] = useState<boolean>(false);
  const [checkResult, setCheckResult] = useState<any | null>(null);
  const [resolving, setResolving] = useState<boolean>(false);

  // Load all uploaded data on mount
  const fetchAllUploadedData = () => {
    setLoadingComplaints(true);
    api.listComplaints()
      .then((data) => {
        setComplaints(data || []);
        // Initialize target authorities to auto-detected authority
        const initialAuthMap: { [id: string]: string } = {};
        (data || []).forEach((c) => {
          const autoAuth = detectAuthorityFromLocation(c.latitude, c.longitude, c.responsible_authority);
          initialAuthMap[c.id] = c.responsible_authority || autoAuth;
        });
        setTargetAuthorities(initialAuthMap);
      })
      .catch((err) => {
        console.error('Failed to load uploaded complaints:', err);
      })
      .finally(() => {
        setLoadingComplaints(false);
      });
  };

  useEffect(() => {
    fetchAllUploadedData();
  }, []);

  // Spatial auto-detection logic according to coordinates
  const detectAuthorityFromLocation = (lat: number, lon: number, fallback?: string): string => {
    // NH-16 Bypass corridor
    if (lat >= 16.8200 && lat <= 16.8380 && lon >= 81.5150 && lon <= 81.5350) {
      return 'National Highways Authority of India (NHAI)';
    }
    // State Highway / SVEC Corridor
    if (lat >= 16.8380 && lat <= 16.8550 && lon >= 81.4950 && lon <= 81.5180) {
      return 'Andhra Pradesh State PWD (Roads & Buildings)';
    }
    // Municipal Ward / Town Corridor
    if (lat >= 16.8100 && lat <= 16.8220 && lon >= 81.5200 && lon <= 81.5320) {
      return 'Tadepalligudem Municipal Corporation';
    }
    return fallback || 'Tadepalligudem Municipal Corporation';
  };

  // Dispatch action: SEND TO CERTAIN AUTHORITY (or ALL Authorities)
  const handleSendToAuthority = async (complaintId: string, overrideAuthority?: string) => {
    const targetAuth = overrideAuthority || targetAuthorities[complaintId];
    if (!targetAuth) return;

    setActionLoading((prev) => ({ ...prev, [complaintId]: true }));
    setFeedback(null);

    try {
      await api.updateComplaintStatus(complaintId, 'Assigned', undefined, targetAuth);
      setFeedback({
        id: complaintId,
        type: 'success',
        message: `Successfully routed & dispatched to ${targetAuth}. Maintenance work order minted.`
      });
      // Refresh complaints list
      fetchAllUploadedData();
    } catch (err: any) {
      setFeedback({
        id: complaintId,
        type: 'error',
        message: err.message || 'Failed to dispatch to authority.'
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [complaintId]: false }));
    }
  };

  // Dispatch action: DO NOT SEND (HOLD IN INTERNAL REVIEW)
  const handleHoldReview = async (complaintId: string) => {
    setActionLoading((prev) => ({ ...prev, [complaintId]: true }));
    setFeedback(null);

    try {
      await api.updateComplaintStatus(
        complaintId, 
        'Under Review', 
        'Held in internal field review by Field Inspector: Do not dispatch to external authority.'
      );
      setFeedback({
        id: complaintId,
        type: 'success',
        message: 'Marked as Under Review. Record retained internally without sending to authority.'
      });
      fetchAllUploadedData();
    } catch (err: any) {
      setFeedback({
        id: complaintId,
        type: 'error',
        message: err.message || 'Failed to hold complaint.'
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [complaintId]: false }));
    }
  };

  // Dispatch action: REJECT / FALSE ALARM
  const handleRejectComplaint = async (complaintId: string) => {
    setActionLoading((prev) => ({ ...prev, [complaintId]: true }));
    setFeedback(null);

    try {
      await api.updateComplaintStatus(
        complaintId, 
        'Rejected', 
        'Rejected by Field Inspector: Insufficient distress threshold or non-hazardous surface defect.'
      );
      setFeedback({
        id: complaintId,
        type: 'success',
        message: 'Complaint rejected and closed.'
      });
      fetchAllUploadedData();
    } catch (err: any) {
      setFeedback({
        id: complaintId,
        type: 'error',
        message: err.message || 'Failed to reject complaint.'
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [complaintId]: false }));
    }
  };

  // ─── LIVE CHECK HANDLERS (TAB 2) ──────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setCheckResult(null);
    }
  };

  const handleRunLiveCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoadingCheck(true);
    setCheckResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      if (notes) formData.append('notes', notes);

      const res = await api.fieldInspectorCheck(formData);
      setCheckResult(res);
    } catch (err: any) {
      alert(err.message || 'Field check failed.');
    } finally {
      setLoadingCheck(false);
    }
  };

  // Filter complaints list
  const filteredComplaints = complaints.filter((c) => {
    // Authority filter
    if (filterAuthority !== 'ALL') {
      const autoAuth = detectAuthorityFromLocation(c.latitude, c.longitude, c.responsible_authority);
      if (filterAuthority === 'NHAI' && !autoAuth.includes('NHAI')) return false;
      if (filterAuthority === 'PWD' && !autoAuth.includes('PWD')) return false;
      if (filterAuthority === 'MUNICIPAL' && !autoAuth.includes('Municipal')) return false;
    }
    // Status filter
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'SUBMITTED' && c.status !== 'Submitted') return false;
      if (filterStatus === 'ASSIGNED' && c.status !== 'Assigned') return false;
      if (filterStatus === 'REVIEW' && c.status !== 'Under Review') return false;
      if (filterStatus === 'CLOSED' && !['Closed', 'Rejected'].includes(c.status)) return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = c.reference_no?.toLowerCase().includes(q);
      const matchRoad = c.road_name?.toLowerCase().includes(q);
      const matchAddr = c.address?.toLowerCase().includes(q);
      return matchRef || matchRoad || matchAddr;
    }
    return true;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Building2 className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Field Inspector &mdash; Uploaded Data & Authority Dispatch
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  View all uploaded distress data, review auto-detected authorities by location, and choose to send or withhold from agencies.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-mono">
              <span className="text-slate-400">Inspector:</span>{' '}
              <span className="text-emerald-400 font-semibold">{user?.full_name || 'P. Suresh'}</span>
            </div>

            <button
              onClick={fetchAllUploadedData}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 space-x-4">
          <button
            onClick={() => setActiveTab('uploaded_data')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'uploaded_data'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All Uploaded Distress Data ({complaints.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('live_check')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'live_check'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>New Live Photo & CRT Check</span>
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            <div className="flex items-center space-x-2">
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 1: ALL UPLOADED DATA WITH AUTO-DETECTED AUTHORITY ROUTING */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'uploaded_data' && (
          <div className="space-y-6">
            
            {/* Filter and Search Bar */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-4">
              
              {/* Search input */}
              <div className="flex-1 min-w-[240px] relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by Reference ID, Road Name, or Street..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Authority Filter */}
              <div className="flex items-center space-x-2 text-xs">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Authority:</span>
                <select
                  value={filterAuthority}
                  onChange={(e) => setFilterAuthority(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="ALL">All Authorities</option>
                  <option value="NHAI">NHAI (NH-16)</option>
                  <option value="PWD">State PWD (SH)</option>
                  <option value="MUNICIPAL">Municipality</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUBMITTED">Pending Routing (Submitted)</option>
                  <option value="ASSIGNED">Sent to Authority (Assigned)</option>
                  <option value="REVIEW">Held in Review</option>
                  <option value="CLOSED">Closed / Resolved</option>
                </select>
              </div>

            </div>

            {/* Complaints Grid */}
            {loadingComplaints ? (
              <div className="bg-slate-900 border border-slate-800 p-12 rounded-2xl text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <p className="text-sm font-mono text-slate-400">Loading uploaded distress reports from database...</p>
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-12 rounded-2xl text-center space-y-3">
                <HelpCircle className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-base font-semibold text-slate-300">No uploaded distress reports found matching filter criteria.</p>
                <p className="text-xs text-slate-500">Reports submitted by citizens or collected during road surveys will automatically appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredComplaints.map((item) => {
                  const autoDetectedAuth = detectAuthorityFromLocation(item.latitude, item.longitude, item.responsible_authority);
                  const currentSelectedAuth = targetAuthorities[item.id] || autoDetectedAuth;
                  const isDispatched = item.status === 'Assigned' || item.status === 'In Progress';
                  const isHeld = item.status === 'Under Review';
                  const isClosed = item.status === 'Closed' || item.status === 'Rejected';
                  const isPending = item.status === 'Submitted';

                  return (
                    <div 
                      key={item.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-slate-700 transition space-y-4"
                    >
                      {/* Top Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div className="flex items-center space-x-3">
                          <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono font-bold text-sky-400">
                            {item.reference_no}
                          </span>
                          <span className="text-xs text-slate-400">
                            Reported on: {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center space-x-2">
                          <span className={`text-[11px] font-bold font-mono px-3 py-1 rounded-full uppercase border ${
                            isDispatched 
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                              : isHeld
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : isClosed
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {/* Main Card Content */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                        
                        {/* Image Thumbnail with Overlay */}
                        <div className="md:col-span-3 relative group">
                          <img
                            src={item.annotated_image_url || item.image_url}
                            alt="Damage evidence"
                            className="w-full h-36 object-cover rounded-xl border border-slate-800 group-hover:opacity-90 transition cursor-pointer"
                            onClick={() => setPreviewImage(item.annotated_image_url || item.image_url)}
                          />
                          <div className="absolute bottom-2 right-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono">
                            Click to View
                          </div>
                        </div>

                        {/* Location & AI Severity Metrics */}
                        <div className="md:col-span-4 space-y-2">
                          <div className="flex items-center space-x-1.5 text-sm font-bold text-white">
                            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="truncate">{item.road_name || item.address || 'Survey Corridor Point'}</span>
                          </div>

                          <p className="text-xs text-slate-400 font-mono">
                            GPS: {item.latitude.toFixed(4)}&deg;N, {item.longitude.toFixed(4)}&deg;E
                          </p>

                          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                            <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/80">
                              <span className="text-[10px] text-slate-400 block uppercase">Peak Severity</span>
                              <span className={`font-mono font-bold ${item.peak_severity >= 0.7 ? 'text-red-400' : 'text-amber-400'}`}>
                                {item.severity_level || 'Moderate'} ({(item.peak_severity * 100).toFixed(0)}%)
                              </span>
                            </div>

                            <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/80">
                              <span className="text-[10px] text-slate-400 block uppercase">ASTM PCI</span>
                              <span className="font-mono font-bold text-sky-400">
                                {item.pci_score || 70} / 100
                              </span>
                            </div>
                          </div>

                          {item.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                              "{item.description}"
                            </p>
                          )}
                        </div>

                        {/* ─── AUTO-DETECTED AUTHORITY & DISPATCH CONTROLS ─── */}
                        <div className="md:col-span-5 bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                          
                          {/* Auto-detected Authority Badge */}
                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                              Location-Based Auto-Detection:
                            </span>
                            <div className="flex items-center space-x-2 bg-sky-500/10 border border-sky-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-300">
                              <Building2 className="w-4 h-4 shrink-0 text-sky-400" />
                              <span className="truncate">{autoDetectedAuth}</span>
                            </div>
                          </div>

                          {/* Target Authority Selector */}
                          <div>
                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                              Target Authority to Dispatch:
                            </label>
                            <select
                              value={currentSelectedAuth}
                              onChange={(e) => setTargetAuthorities({ ...targetAuthorities, [item.id]: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                            >
                              {AUTHORITY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Action Buttons: Send to Authority or Do Not Send */}
                          <div className="space-y-2 pt-1">
                            {/* SEND TO ALL AUTHORITIES BUTTON (BROADCAST) */}
                            {!isDispatched && (
                              <button
                                onClick={() => handleSendToAuthority(item.id, 'All Authorities (Joint: NHAI, State PWD, Municipality)')}
                                disabled={actionLoading[item.id]}
                                className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white transition flex items-center justify-center gap-1.5 shadow-md border border-indigo-400/30"
                                title="Broadcast this distress report simultaneously to NHAI, State PWD, and Municipal authorities"
                              >
                                {actionLoading[item.id] ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <Layers className="w-3.5 h-3.5" />
                                    <span>Send to All Authorities (Joint Broadcast)</span>
                                  </>
                                )}
                              </button>
                            )}

                            <div className="flex flex-wrap gap-2">
                              {/* SEND TO SELECTED / AUTO-DETECTED AUTHORITY BUTTON */}
                              <button
                                onClick={() => handleSendToAuthority(item.id)}
                                disabled={actionLoading[item.id] || isDispatched}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow ${
                                  isDispatched
                                    ? 'bg-purple-900/40 border border-purple-500/30 text-purple-300 cursor-default'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                }`}
                              >
                                {actionLoading[item.id] ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : isDispatched ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Dispatched: {item.responsible_authority?.includes('All') ? 'All Authorities' : 'Agency'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Send to Selected</span>
                                  </>
                                )}
                              </button>

                              {/* DO NOT SEND (HOLD) BUTTON */}
                              <button
                                onClick={() => handleHoldReview(item.id)}
                                disabled={actionLoading[item.id] || isHeld}
                                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
                                  isHeld
                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                                }`}
                                title="Keep in internal review without sending to authority"
                              >
                                <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                                <span>{isHeld ? 'Held in Review' : 'Do Not Send'}</span>
                              </button>

                              {/* REJECT BUTTON */}
                              {!isClosed && (
                                <button
                                  onClick={() => handleRejectComplaint(item.id)}
                                  disabled={actionLoading[item.id]}
                                  className="p-2 bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 rounded-lg transition"
                                  title="Reject as invalid or duplicate"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: LIVE FIELD PHOTO CAPTURE & CRT CHECK                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'live_check' && (
          <div className="space-y-6">
            
            <form onSubmit={handleRunLiveCheck} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Photo Upload */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span>Capture / Upload New Inspection Picture</span>
                </h2>

                <div className="border-2 border-dashed border-slate-700 hover:border-sky-500/50 rounded-xl p-4 text-center transition bg-slate-950/50">
                  {previewUrl ? (
                    <div className="space-y-3">
                      <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg border border-slate-800" />
                      <label className="text-sky-400 hover:text-sky-300 text-xs font-semibold cursor-pointer block">
                        Change Photo
                        <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-48 cursor-pointer group">
                      <Camera className="w-12 h-12 text-slate-500 group-hover:text-sky-400 transition mb-2" />
                      <p className="text-sm font-semibold text-slate-300">Click to Snap Photo or Browse File</p>
                      <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Inspection Field Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Coordinates & Presets */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Location & GPS Snapping Presets</span>
                  </h2>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => { setLatitude(16.8260); setLongitude(81.5210); }}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        latitude === 16.8260 ? 'bg-sky-500/10 border-sky-500 text-sky-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <p className="text-xs font-bold text-white">NH-16 Bypass</p>
                      <p className="text-[10px] text-slate-400">NHAI Corridor</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setLatitude(16.8420); setLongitude(81.5050); }}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        latitude === 16.8420 ? 'bg-sky-500/10 border-sky-500 text-sky-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <p className="text-xs font-bold text-white">SVEC Main Road</p>
                      <p className="text-[10px] text-slate-400">AP PWD Corridor</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setLatitude(16.8160); setLongitude(81.5260); }}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        latitude === 16.8160 ? 'bg-sky-500/10 border-sky-500 text-sky-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <p className="text-xs font-bold text-white">Ward 5 Street</p>
                      <p className="text-[10px] text-slate-400">Municipal Corridor</p>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={latitude}
                        onChange={(e) => setLatitude(parseFloat(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={longitude}
                        onChange={(e) => setLongitude(parseFloat(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingCheck || !file}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loadingCheck ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Checking Database Proximity & Running AI...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>Execute Spatial Inspection & CRT Check</span>
                    </>
                  )}
                </button>
              </div>

            </form>

            {/* CRT Check Result Modal/Card */}
            {checkResult && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-3">
                    {checkResult.already_present ? (
                      <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
                        <AlertTriangle className="w-6 h-6" />
                      </span>
                    ) : (
                      <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30">
                        <CheckCircle2 className="w-6 h-6" />
                      </span>
                    )}
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {checkResult.already_present 
                          ? `Existing Distress Match Found (Ref: ${checkResult.crt?.matched_reference_no})` 
                          : 'No Prior Record Found &mdash; New Field Discovery'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Auto-detected Authority: <strong>{detectAuthorityFromLocation(latitude, longitude)}</strong>
                      </p>
                    </div>
                  </div>

                  <span className={`text-xs font-bold font-mono px-3 py-1 rounded-lg uppercase ${
                    checkResult.crt?.crt_status === 'PASSED' ? 'bg-emerald-500 text-slate-950' : 'bg-red-500 text-white'
                  }`}>
                    Verdict: {checkResult.crt?.crt_status || 'NEW'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {checkResult.crt?.crt_message}
                </p>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Image Zoom Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white uppercase tracking-wider">High-Resolution Damage Evidence</span>
              <button onClick={() => setPreviewImage(null)} className="text-slate-400 hover:text-white font-bold text-base">✕</button>
            </div>
            <img src={previewImage} alt="Expanded damage evidence" className="w-full max-h-[75vh] object-contain rounded-xl border border-slate-800" />
          </div>
        </div>
      )}

    </div>
  );
};
