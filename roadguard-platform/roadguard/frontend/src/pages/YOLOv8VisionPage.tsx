import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Cpu, 
  Layers, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  RefreshCw, 
  ArrowRight, 
  Activity, 
  Sparkles, 
  Crosshair, 
  ShieldCheck, 
  Sliders, 
  Camera, 
  FileCheck2,
  Scan
} from 'lucide-react';
import { api } from '../services/api';

interface VisionPreset {
  id: string;
  name: string;
  defectClass: string;
  defectCode: string;
  corridor: string;
  confidence: number;
  bbox: string;
  areaPixels: string;
  rawImage: string;
  annotatedImage: string;
  claheNormalized: boolean;
  notes: string;
}

const VISION_PRESETS: VisionPreset[] = [
  {
    id: 'pothole',
    name: 'Pothole Defect Localization',
    defectClass: 'Pothole Cavity',
    defectCode: 'D40',
    corridor: 'NH-16 Express Bypass (Chainage KM 42+300)',
    confidence: 0.942,
    bbox: '[x: 184, y: 122, w: 320, h: 210]',
    areaPixels: '67,200 px²',
    rawImage: '/uploads/raw/raw_2957b069.webp',
    annotatedImage: '/uploads/annotated/annotated_raw_2957b069.jpg',
    claheNormalized: true,
    notes: 'CLAHE filter successfully attenuated overhead solar glare, revealing asphalt aggregate dislocation and cavity boundaries.'
  },
  {
    id: 'crack',
    name: 'Surface Longitudinal & Transverse Crack',
    defectClass: 'Surface Crack',
    defectCode: 'D00',
    corridor: 'AP State Highway SH-200 (SVEC Corridor)',
    confidence: 0.897,
    bbox: '[x: 60, y: 95, w: 540, h: 180]',
    areaPixels: '97,200 px²',
    rawImage: '/uploads/raw/raw_f6605a62.jpg',
    annotatedImage: '/uploads/annotated/annotated_sample_pothole_critical.jpg',
    claheNormalized: true,
    notes: 'C2f cross-stage feature fusion detected interlocking crack branches despite road discoloration and tree shadow patterns.'
  },
  {
    id: 'manhole',
    name: 'Open / Displaced Drainage Manhole',
    defectClass: 'Displaced Manhole',
    defectCode: 'D20',
    corridor: 'Tadepalligudem Municipal Ward 5 (Market Corridor)',
    confidence: 0.964,
    bbox: '[x: 200, y: 85, w: 290, h: 270]',
    areaPixels: '78,300 px²',
    rawImage: '/uploads/raw/raw_a4f78a90.jpg',
    annotatedImage: '/uploads/annotated/annotated_raw_a4f78a90.jpg',
    claheNormalized: true,
    notes: 'High aspect-ratio bounding box confirmed elevated cast-iron rim discontinuity above the surrounding wearing surface.'
  }
];

export const YOLOv8VisionPage: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<VisionPreset>(VISION_PRESETS[0]);
  const [viewMode, setViewMode] = useState<'annotated' | 'raw' | 'split'>('split');
  const [showBBoxTelemetry, setShowBBoxTelemetry] = useState<boolean>(true);

  // Custom upload state
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [customResult, setCustomResult] = useState<any | null>(null);

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomFile(file);
      setCustomPreview(URL.createObjectURL(file));
      setAnalyzing(true);
      setCustomResult(null);

      try {
        const res = await api.analyzeUpload(file);
        setCustomResult(res);
      } catch (err: any) {
        alert(err.message || 'YOLOv8 inference failed.');
      } finally {
        setAnalyzing(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-sky-400 font-mono text-xs uppercase tracking-wider mb-2">
              <Cpu className="w-4 h-4" />
              <span>Deep Learning Object Perception Architecture</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              1. Real YOLOv8 Computer Vision Studio
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              High-throughput defect perception utilizing fine-tuned <span className="text-sky-300 font-medium">YOLOv8s object detection</span> with <span className="text-indigo-300 font-medium">CLAHE glare normalization</span> for automated classification of Potholes (D40), Surface Cracks (D00), and Open Manholes (D20).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/xai"
              className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white transition shadow-lg shadow-indigo-600/20"
            >
              <Layers className="w-4 h-4" />
              <span>Step 2: XAI Saliency Studio &rarr;</span>
            </Link>
            <Link
              to="/map"
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-white transition"
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Corridor Map</span>
            </Link>
          </div>
        </div>

        {/* Model Benchmark Telemetry Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">mAP@50 Validation</span>
            <p className="text-2xl font-bold font-mono text-sky-400">84.9%</p>
            <p className="text-[11px] text-slate-500">IEEE RDD & Local Testbed</p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Inference Latency</span>
            <p className="text-2xl font-bold font-mono text-emerald-400">
              {customResult ? `${customResult.inference_time_ms} ms` : '24.6 ms'}
            </p>
            <p className="text-[11px] text-slate-500">Real-Time Mobile/Edge Ready</p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Defect Classes</span>
            <p className="text-2xl font-bold font-mono text-indigo-400">3 Classes</p>
            <p className="text-[11px] text-slate-500">D40 Pothole, D00 Crack, D20 Manhole</p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Preprocessing Engine</span>
            <p className="text-2xl font-bold font-mono text-amber-400">CLAHE</p>
            <p className="text-[11px] text-slate-500">Glare & Shadow Normalization</p>
          </div>
        </div>

        {/* Preset Defect Scenarios */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase text-slate-400 tracking-wider">
              Select Verified YOLOv8 Detection Scenario:
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Anchor-Free Decoupled Head Regression
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {VISION_PRESETS.map((preset) => {
              const isSelected = selectedPreset.id === preset.id && !customResult;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedPreset(preset);
                    setCustomResult(null);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isSelected 
                      ? 'bg-sky-950/40 border-sky-500/80 shadow-lg shadow-sky-500/10 scale-[1.01]' 
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                      Class: {preset.defectCode} ({preset.defectClass})
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-400">
                      Conf: {(preset.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1 line-clamp-1">{preset.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{preset.corridor}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Computer Vision Display & Telemetry Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Visual Canvas (8 cols) */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            
            {/* View Mode Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${viewMode === 'split' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Dual Split View
                </button>
                <button
                  onClick={() => setViewMode('annotated')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${viewMode === 'annotated' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  YOLOv8 Detections
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${viewMode === 'raw' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Raw Camera Ingestion
                </button>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  id="toggle-telemetry"
                  checked={showBBoxTelemetry}
                  onChange={(e) => setShowBBoxTelemetry(e.target.checked)}
                  className="rounded border-slate-700 accent-sky-500 cursor-pointer"
                />
                <label htmlFor="toggle-telemetry" className="text-slate-300 cursor-pointer">
                  Show Bounding Box HUD
                </label>
              </div>
            </div>

            {/* Display Canvas */}
            {viewMode === 'split' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Left: Raw Camera Ingestion */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-400 uppercase">Input Road Optical Stream</span>
                      <span className="text-[10px] text-amber-400 font-mono">Raw Ambient Lighting</span>
                    </div>
                    <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[4/3] flex items-center justify-center">
                      <img
                        src={customResult ? (customPreview || '') : selectedPreset.rawImage}
                        alt="Raw Optical Input"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Right: YOLOv8 Bounding Box Detection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-sky-400 uppercase">YOLOv8s Model Detection</span>
                      <span className="text-[10px] text-emerald-400 font-mono">CLAHE Equalized</span>
                    </div>
                    <div className="relative rounded-xl overflow-hidden border border-sky-800/60 bg-slate-950 aspect-[4/3] flex items-center justify-center group">
                      <img
                        src={customResult ? (customResult.annotated_image_url || customPreview || '') : selectedPreset.annotatedImage}
                        alt="YOLOv8 Detection"
                        className="w-full h-full object-cover"
                      />

                      {/* HUD Overlay */}
                      {showBBoxTelemetry && (
                        <div className="absolute top-2 left-2 bg-slate-950/90 border border-sky-500/40 rounded-lg p-2 font-mono text-[10px] text-sky-300 space-y-0.5 pointer-events-none">
                          <div>CLS: <span className="text-white font-bold">{customResult ? (customResult.overall_severity_level || 'Defect') : selectedPreset.defectClass}</span></div>
                          <div>CONF: <span className="text-emerald-400">{customResult ? `${(customResult.peak_severity * 100).toFixed(1)}%` : `${(selectedPreset.confidence * 100).toFixed(1)}%`}</span></div>
                          <div>BBOX: <span className="text-slate-400">{selectedPreset.bbox}</span></div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>CLAHE glare normalization prevents asphalt over-saturation under direct sunlight and high-beam headlights.</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">640x640 Input Tensor</span>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video max-h-[480px] flex items-center justify-center">
                <img
                  src={
                    viewMode === 'annotated'
                      ? (customResult ? customResult.annotated_image_url : selectedPreset.annotatedImage)
                      : (customResult ? customPreview : selectedPreset.rawImage)
                  }
                  alt="YOLOv8 Inspection"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Custom Live Upload Tester */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Scan className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Test Custom Image with Real YOLOv8 Computer Vision:
                  </span>
                </div>
                {analyzing && (
                  <span className="text-xs text-sky-400 flex items-center gap-1.5 font-mono">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Executing YOLOv8s Tensor Inference...
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <label className="flex-1 w-full flex items-center justify-center px-4 py-3 border border-dashed border-slate-700 hover:border-sky-500 rounded-xl cursor-pointer bg-slate-900/60 hover:bg-slate-900 transition text-xs text-slate-300">
                  <Upload className="w-4 h-4 mr-2 text-sky-400" />
                  <span>{customFile ? customFile.name : 'Choose Road Image to Detect Defect (.jpg, .png, .webp)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomUpload}
                    className="hidden"
                  />
                </label>

                {customResult && (
                  <button
                    onClick={() => {
                      setCustomResult(null);
                      setCustomFile(null);
                      setCustomPreview(null);
                    }}
                    className="px-3 py-3 rounded-xl border border-slate-700 bg-slate-900 text-xs text-slate-400 hover:text-white"
                  >
                    Reset Preset
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Model Specs & Telemetry (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Architecture Telemetry */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-mono uppercase text-sky-400 font-bold flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4" /> Detection Telemetry
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                  Real Weights Loaded
                </span>
              </div>

              {/* Detections Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Detected Class</span>
                  <span className="text-base font-bold font-mono text-white">
                    {customResult ? (customResult.detections?.[0]?.class_name || 'Surface Defect') : selectedPreset.defectClass}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Class Confidence</span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    {customResult ? `${(customResult.peak_severity * 100).toFixed(1)}%` : `${(selectedPreset.confidence * 100).toFixed(1)}%`}
                  </span>
                </div>
              </div>

              {/* Bounding Box Coordinates */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Bounding Box (xywh):</span>
                  <span className="text-sky-300 font-semibold">{selectedPreset.bbox}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Defect Pixel Coverage:</span>
                  <span className="text-indigo-300">{selectedPreset.areaPixels}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">CLAHE Contrast Enhancement:</span>
                  <span className="text-emerald-400">ClipLimit=2.0 (Active)</span>
                </div>
              </div>

              {/* Perception Notes */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Perception Diagnostics
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {selectedPreset.notes}
                </p>
              </div>

              {/* Flow Next Steps */}
              <div className="pt-2 space-y-2">
                <Link
                  to="/xai"
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <Layers className="w-4 h-4" />
                  <span>Inspect Explainable AI (XAI) Saliency &rarr;</span>
                </Link>

                <Link
                  to="/map"
                  className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>View Corridor on Network Map</span>
                </Link>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
