import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AIAnalysisResult, SnapResult } from '../types';
import { 
  Upload, 
  MapPin, 
  Cpu, 
  CheckCircle, 
  AlertTriangle, 
  Eye, 
  Layers, 
  Building2, 
  Navigation,
  FileCheck2,
  Clock,
  Sparkles
} from 'lucide-react';

export const NewComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form State
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number>(16.8260);
  const [longitude, setLongitude] = useState<number>(81.5210);
  const [address, setAddress] = useState<string>('NH-16 Tadepalligudem Bypass, West Godavari');
  const [description, setDescription] = useState<string>('Severe depression cavity in left lane creating tyre blowout hazard.');

  // AI & GIS States
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);
  const [geocodeSource, setGeocodeSource] = useState<string | null>(null);
  const [fetchingGPS, setFetchingGPS] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preset location buttons for quick demonstration
  const locationPresets = [
    { label: 'NH-16 Bypass (NHAI)', lat: 16.8260, lon: 81.5210, name: 'NH-16 Tadepalligudem Bypass, West Godavari' },
    { label: 'SVEC College Road (AP PWD)', lat: 16.8420, lon: 81.5050, name: 'Pedatadepalli - SVEC College Main Road, Tadepalligudem' },
    { label: 'Subba Rao Road (Municipality)', lat: 16.8160, lon: 81.5260, name: 'Subba Rao Road, Ward 5, Tadepalligudem' },
    { label: 'Unknown Rural Point (Manual Review)', lat: 16.9000, lon: 81.6000, name: 'Unmapped Rural Corridor, West Godavari' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setImagePreview(URL.createObjectURL(selected));
      setAiResult(null); // Reset previous analysis
    }
  };

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser. Please select a preset corridor or enter coordinates manually.');
      return;
    }
    setFetchingGPS(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setFetchingGPS(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(5));
        const lon = parseFloat(pos.coords.longitude.toFixed(5));
        setLatitude(lat);
        setLongitude(lon);
        await triggerGISAndReverseGeocode(lat, lon);
      },
      (err) => {
        setFetchingGPS(false);
        let msg = 'Failed to acquire GPS location.';
        if (err.code === 1) {
          msg = 'Location permission denied by browser. Please enable location permissions or choose a corridor preset.';
        } else if (err.code === 2) {
          msg = 'Position unavailable. GPS signal could not be locked.';
        } else if (err.code === 3) {
          msg = 'GPS request timed out.';
        }
        setError(msg);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const triggerGISAndReverseGeocode = async (lat: number, lon: number, overwriteAddress = true) => {
    try {
      // 1. Spatial jurisdiction snap
      const snap = await api.snapCoordinates(lat, lon);
      setSnapResult(snap);

      // 2. OpenStreetMap Reverse Geocoding
      const geo = await api.reverseGeocode(lat, lon);
      if (geo && geo.display_name) {
        setGeocodeSource(geo.source === 'openstreetmap_nominatim' ? 'OpenStreetMap Nominatim' : 'Road Network GIS');
        if (overwriteAddress) {
          setAddress(geo.display_name);
        }
      } else if (snap.road_name && overwriteAddress) {
        setAddress(snap.road_name);
        setGeocodeSource('Road Network GIS');
      }
    } catch (err) {
      console.error('GIS snap or geocode error:', err);
    }
  };

  const handlePresetSelect = async (preset: typeof locationPresets[0]) => {
    setLatitude(preset.lat);
    setLongitude(preset.lon);
    setAddress(preset.name);
    await triggerGISAndReverseGeocode(preset.lat, preset.lon, false);
  };

  const handleLoadSample = async (url: string, lat: number, lon: number, desc: string) => {
    try {
      setAnalyzing(true);
      setError(null);
      setLatitude(lat);
      setLongitude(lon);
      setDescription(desc);
      setImagePreview(url);

      const res = await fetch(url);
      const blob = await res.blob();
      const sampleFile = new File([blob], 'sample_distress.jpg', { type: blob.type || 'image/jpeg' });
      setFile(sampleFile);

      // Run AI analysis
      const analysis = await api.analyzeUpload(sampleFile);
      setAiResult(analysis);

      await triggerGISAndReverseGeocode(lat, lon, true);
    } catch (err: any) {
      console.error('Failed to load sample:', err);
      setError('Failed to analyze sample image: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRunAIAnalysis = async () => {
    if (!file) {
      setError('Please select or upload a road damage image first.');
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      // 1. Run AI analysis
      const analysis = await api.analyzeUpload(file);
      setAiResult(analysis);
      
      // 2. Run GIS snapping & Geocoding
      await triggerGISAndReverseGeocode(latitude, longitude, address === '');
    } catch (err: any) {
      setError(err.message || 'AI perception analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiResult) {
      setError('Please run AI analysis first to inspect defect severity and jurisdiction routing.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        description,
        latitude,
        longitude,
        address,
        image_url: aiResult.raw_image_url || '/uploads/sample.jpg',
        annotated_image_url: aiResult.annotated_image_url,
        xai_heatmap_url: aiResult.xai_heatmap_url,
        peak_severity: aiResult.peak_severity,
        severity_level: aiResult.overall_severity_level,
        pci_score: aiResult.pci_score,
        detections: aiResult.detections,
        road_name: snapResult?.road_name,
        road_hierarchy: snapResult?.hierarchy,
        jurisdiction: snapResult?.jurisdiction,
        responsible_authority: snapResult?.responsible_authority,
        division: snapResult?.division,
        gis_match_distance: snapResult?.distance_meters,
        requires_manual_routing: snapResult?.requires_manual_routing ?? false
      };

      const res = await api.submitComplaint(payload);
      setSubmittedRef(res.reference_no);
    } catch (err: any) {
      setError(err.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };


  // Damage reporting is strictly for citizens / public visitors; restricted for authority roles
  if (user && user.role !== 'citizen') {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex items-center justify-center p-4 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Citizen Reporting Only</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Damage reporting is reserved for citizens and road users. As an authority account ({user.role.replace(/_/g, ' ')}), please review incoming reports in your designated portal.
          </p>
          <div className="pt-2">
            <Link
              to={user.role === 'admin' ? '/admin' : user.role === 'maintenance_contractor' ? '/maintenance' : '/authority'}
              className="inline-block bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow transition"
            >
              Open Your Section
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase text-sky-400 tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4" /> Automated Computer Vision & GIS Dispatch
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Lodge Road Damage Report</h1>
            <p className="text-sm text-slate-400">
              Upload optical road imagery. The system runs YOLOv8 defect detection, evaluates ASTM D6433 PCI severity, and snaps coordinates to the authorized jurisdiction.
            </p>
          </div>
          <Link
            to="/xai"
            className="self-start sm:self-auto flex items-center space-x-2 px-4 py-2 bg-indigo-950/60 border border-indigo-700/50 hover:bg-indigo-900/60 text-indigo-300 rounded-xl text-xs font-semibold transition shrink-0"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Open XAI Saliency Studio &rarr;</span>
          </Link>
        </div>

        {/* Success Modal / Banner */}
        {submittedRef && (
          <div className="bg-emerald-950/80 border-2 border-emerald-500 p-6 rounded-2xl text-center space-y-4 shadow-2xl">
            <div className="inline-flex p-3 bg-emerald-500/20 text-emerald-400 rounded-full">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white">Complaint Lodged Successfully!</h2>
            <p className="text-sm text-slate-300">
              Your grievance reference number has been minted and dispatched to the authorized maintenance agency.
            </p>
            <div className="inline-block bg-slate-900 border border-emerald-500/50 px-6 py-3 rounded-xl font-mono text-2xl font-extrabold text-emerald-400 tracking-wider">
              {submittedRef}
            </div>
            <div className="flex justify-center gap-4 pt-2">
              <button
                onClick={() => navigate(`/track?ref=${submittedRef}`)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow"
              >
                Track Live Status
              </button>
              <button
                onClick={() => {
                  setSubmittedRef(null);
                  setFile(null);
                  setImagePreview(null);
                  setAiResult(null);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-5 py-2.5 rounded-xl transition"
              >
                Submit Another Report
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!submittedRef && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Form & Inputs */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Step 1: Upload Image */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-mono">1</span>
                    Upload Pavement Image
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">JPEG / PNG / WebP</span>
                </div>

                <div className="border-2 border-dashed border-slate-700 hover:border-sky-500/50 rounded-xl p-6 text-center cursor-pointer transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="road-image-input"
                  />
                  <label htmlFor="road-image-input" className="cursor-pointer space-y-2 block">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-300 font-medium">Click to select road image or drag and drop</p>
                    <p className="text-[10px] text-slate-500">Supports mobile phone cameras and dashboard optical footage</p>
                  </label>
                </div>

                {/* 1-Click Quick Test Presets */}
                <div className="pt-1 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      Quick Test Samples (Instant XAI):
                    </span>
                    <span className="text-[10px] text-indigo-400 font-mono">1-Click AI Analysis</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadSample('/uploads/raw/raw_2957b069.webp', 16.8285, 81.5270, 'Severe Pothole (D40) on NH-16 Express Bypass')}
                      disabled={analyzing}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 rounded-xl text-left transition disabled:opacity-50 group"
                    >
                      <span className="text-[10px] text-sky-400 block font-mono">NH-16 Bypass</span>
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Pothole (D40)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadSample('/uploads/raw/raw_f6605a62.jpg', 16.8440, 81.5030, 'Surface Crack on AP State Highway SVEC Road')}
                      disabled={analyzing}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition disabled:opacity-50 group"
                    >
                      <span className="text-[10px] text-indigo-400 block font-mono">State PWD</span>
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Crack (D00)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadSample('/uploads/raw/raw_a4f78a90.jpg', 16.8155, 81.5260, 'Displaced Manhole & Rim Shear in Municipal Ward 5')}
                      disabled={analyzing}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-left transition disabled:opacity-50 group"
                    >
                      <span className="text-[10px] text-emerald-400 block font-mono">Ward 5 Muni</span>
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Manhole (D20)</span>
                    </button>
                  </div>
                </div>

                {imagePreview && (
                  <div className="space-y-3">
                    <img
                      src={imagePreview}
                      alt="Selected road"
                      className="w-full h-48 object-cover rounded-xl border border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={handleRunAIAnalysis}
                      disabled={analyzing}
                      className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl shadow-lg transition disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{analyzing ? 'Executing YOLOv8 Inference...' : 'Run AI Damage & Saliency Analysis'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Geographic Coordinates */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-mono">2</span>
                    Geographic Coordinates (GPS)
                  </h3>
                  <button
                    type="button"
                    onClick={handleUseGPS}
                    disabled={fetchingGPS}
                    className="flex items-center space-x-1 text-xs text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 rounded-lg border border-sky-500/30 transition disabled:opacity-50"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{fetchingGPS ? 'Acquiring GPS...' : 'Auto GPS'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={latitude}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setLatitude(val);
                        triggerGISAndReverseGeocode(val, longitude, false);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={longitude}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setLongitude(val);
                        triggerGISAndReverseGeocode(latitude, val, false);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono mt-1"
                    />
                  </div>
                </div>

                {/* Reverse Geocoded Address Field */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase">
                      Street / Corridor Address (Human Readable)
                    </label>
                    {geocodeSource && (
                      <span className="text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-mono">
                        {geocodeSource}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter or auto-detect corridor location name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white mt-1 focus:outline-none focus:border-sky-500"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Auto-resolved via OpenStreetMap Nominatim. You can also edit this address manually.
                  </p>
                </div>

                {/* Preset Location Quick Buttons */}
                <div>
                  <p className="text-[11px] text-slate-400 mb-2 font-semibold uppercase tracking-wider">
                    Quick Preset Corridors (Demonstration Network):
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {locationPresets.map((loc) => (
                      <button
                        key={loc.label}
                        type="button"
                        onClick={() => handlePresetSelect(loc)}
                        className="text-left p-2 bg-slate-950 border border-slate-800 hover:border-sky-500/50 rounded-lg text-xs transition"
                      >
                        <p className="font-semibold text-slate-200">{loc.label}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{loc.lat}, {loc.lon}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase">Description / Landmark</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white mt-1 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

            </div>

            {/* Right Column: AI Detection & Saliency Results */}
            <div className="lg:col-span-6 space-y-6">
              
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-mono">3</span>
                    AI Pre-Analysis & XAI Results
                  </h3>
                  {aiResult && (
                    <span className="text-[10px] bg-slate-800 text-sky-300 font-mono px-2 py-0.5 rounded">
                      {aiResult.inference_time_ms} ms
                    </span>
                  )}
                </div>

                {!aiResult ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-slate-800 rounded-xl bg-slate-950/40 text-slate-500">
                    <Eye className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-xs font-medium">Awaiting optical image analysis...</p>
                    <p className="text-[11px] text-slate-600 mt-1">Upload an image on the left and click "Run AI Damage Analysis".</p>
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    
                    {/* Visual Before / Heatmap */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-mono text-slate-400 mb-1">YOLOv8 Detection Bounding Box</p>
                        <img
                          src={aiResult.annotated_image_url || imagePreview || ''}
                          alt="Annotated detection"
                          className="w-full h-36 object-cover rounded-lg border border-slate-700"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-indigo-400 mb-1">Explainable AI Saliency Heatmap</p>
                        <img
                          src={aiResult.xai_heatmap_url || ''}
                          alt="XAI Saliency"
                          className="w-full h-36 object-cover rounded-lg border border-indigo-700/50"
                        />
                      </div>
                    </div>

                    {/* Metrics Banner */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Defects</p>
                        <p className="text-base font-bold text-white font-mono">{aiResult.total_detections}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Severity</p>
                        <p className="text-base font-bold text-red-400 font-mono">
                          {(aiResult.peak_severity * 100).toFixed(1)}% ({aiResult.overall_severity_level})
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">PCI Score</p>
                        <p className="text-base font-bold text-emerald-400 font-mono">{aiResult.pci_score} / 100</p>
                      </div>
                    </div>

                    {/* XAI Civil Engineering Justification */}
                    {aiResult.saliency_analysis && (
                      <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-mono uppercase text-indigo-300 font-semibold flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" /> Explainable Engineering Justification
                        </span>
                        <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
                          {aiResult.saliency_analysis.interpretability_reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                        <div className="pt-1 text-[11px] border-t border-indigo-800/30 text-indigo-300">
                          <strong>Recommended Action:</strong> {aiResult.saliency_analysis.civil_recommendation}
                        </div>
                      </div>
                    )}

                    {/* GIS Snapped Jurisdiction */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-sky-400 font-semibold flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" /> Autonomous Jurisdiction Routing
                      </span>
                      <p className="text-slate-200 font-semibold text-xs">
                        {snapResult?.road_name || 'Calculating closest corridor...'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        <strong>Responsible Authority:</strong> {snapResult?.responsible_authority || 'Pending'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Distance to centerline: {snapResult?.distance_meters ?? 0}m | Hierarchy: {snapResult?.hierarchy ?? 'URBAN'}
                      </p>
                    </div>

                    {/* Submit Confirmation Button */}
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg transition disabled:opacity-50 text-sm"
                    >
                      <FileCheck2 className="w-5 h-5" />
                      <span>{submitting ? 'Submitting to Authority...' : 'Confirm & Lodge Formal Report'}</span>
                    </button>

                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
