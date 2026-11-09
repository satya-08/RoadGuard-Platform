import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../services/api';
import { MapPin, Filter } from 'lucide-react';

// Fix Leaflet's default marker icon paths in Vite bundles
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CORRIDORS = [
  {
    id: 'corridor-nh16',
    segment_code: 'SEG-NH16-TPG-01',
    road_name: 'NH-16 Bypass (NHAI)',
    hierarchy: 'NH',
    jurisdiction: 'National Highways Authority of India (NHAI)',
    responsible_authority: 'National Highways Authority of India (NHAI)',
    health_score: 85,
    condition_status: 'Good',
    start: [16.8250, 81.5200],
    end: [16.8350, 81.5300],
    total_defects: 3
  },
  {
    id: 'corridor-svec',
    segment_code: 'SEG-SH-SVEC-02',
    road_name: 'SVEC Main Road (AP PWD)',
    hierarchy: 'SH',
    jurisdiction: 'Andhra Pradesh State PWD (Roads & Buildings)',
    responsible_authority: 'Andhra Pradesh State PWD (Roads & Buildings)',
    health_score: 68,
    condition_status: 'Moderate',
    start: [16.8400, 81.5000],
    end: [16.8500, 81.5150],
    total_defects: 6
  },
  {
    id: 'corridor-ward5',
    segment_code: 'SEG-MUN-TPG-03',
    road_name: 'Ward 5 (Municipality)',
    hierarchy: 'WARD',
    jurisdiction: 'Tadepalligudem Municipal Corporation',
    responsible_authority: 'Tadepalligudem Municipal Corporation',
    health_score: 52,
    condition_status: 'Poor',
    start: [16.8150, 81.5250],
    end: [16.8200, 81.5280],
    total_defects: 5
  }
];

const DEFAULT_DEFECTS = [
  {
    id: 'def-1',
    reference_no: 'RG-261103-CR01',
    lat: 16.8290,
    lon: 81.5240,
    severity_level: 'Critical',
    peak_severity: 0.88,
    priority_tier: 'Critical Distress (MPS ≥ 70)',
    status: 'Submitted',
    road_name: 'NH-16 Bypass (NHAI)',
    responsible_authority: 'National Highways Authority of India (NHAI)'
  },
  {
    id: 'def-2',
    reference_no: 'RG-261103-MD02',
    lat: 16.8440,
    lon: 81.5080,
    severity_level: 'Medium',
    peak_severity: 0.54,
    priority_tier: 'Moderate Maintenance',
    status: 'Assigned',
    road_name: 'SVEC Main Road (AP PWD)',
    responsible_authority: 'Andhra Pradesh State PWD (Roads & Buildings)'
  },
  {
    id: 'def-3',
    reference_no: 'RG-261103-MN03',
    lat: 16.8175,
    lon: 81.5265,
    severity_level: 'Low',
    peak_severity: 0.28,
    priority_tier: 'Minor Surface Distress',
    status: 'Under Review',
    road_name: 'Ward 5 (Municipality)',
    responsible_authority: 'Tadepalligudem Municipal Corporation'
  }
];

// Helper to create geometric symbol icons for corridors (Triangles, Diamonds, Squares)
const createSymbolIcon = (hierarchy: string, label: string) => {
  let shapeSvg = '';
  let color = '';
  let badgeColor = '';
  let borderColor = '';

  if (hierarchy === 'NH') {
    // Equilateral Triangle (NHAI)
    color = '#0284c7';
    badgeColor = '#38bdf8';
    borderColor = '#0284c7';
    shapeSvg = `
      <svg width="26" height="26" viewBox="0 0 24 24" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">
        <polygon points="12,2 23,21 1,21" fill="#0284c7" stroke="#ffffff" stroke-width="2.2"/>
      </svg>
    `;
  } else if (hierarchy === 'SH') {
    // Diamond (State PWD)
    color = '#8b5cf6';
    badgeColor = '#c084fc';
    borderColor = '#8b5cf6';
    shapeSvg = `
      <svg width="26" height="26" viewBox="0 0 24 24" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">
        <polygon points="12,1 23,12 12,23 1,12" fill="#8b5cf6" stroke="#ffffff" stroke-width="2.2"/>
      </svg>
    `;
  } else {
    // Square / Box (Municipality)
    color = '#10b981';
    badgeColor = '#34d399';
    borderColor = '#10b981';
    shapeSvg = `
      <svg width="26" height="26" viewBox="0 0 24 24" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">
        <rect x="2" y="2" width="20" height="20" rx="3" fill="#10b981" stroke="#ffffff" stroke-width="2.2"/>
      </svg>
    `;
  }

  const html = `
    <div style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
      ${shapeSvg}
      <span style="background:rgba(15,23,42,0.9); color:${badgeColor}; font-size:9px; font-weight:bold; padding:1px 5px; border-radius:4px; margin-top:2px; white-space:nowrap; border:1px solid ${borderColor}; box-shadow:0 2px 4px rgba(0,0,0,0.5);">
        ${label}
      </span>
    </div>
  `;

  return L.divIcon({
    className: 'custom-corridor-symbol',
    html: html,
    iconSize: [60, 48],
    iconAnchor: [30, 16],
  });
};

export const InteractiveMapPage: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.FeatureGroup | null>(null);
  const [mapData, setMapData] = useState<{ corridors: any[]; defects: any[] }>({
    corridors: DEFAULT_CORRIDORS,
    defects: DEFAULT_DEFECTS,
  });
  const [filterAuth, setFilterAuth] = useState<string>('ALL');

  useEffect(() => {
    // Fetch live map layers from backend
    api.getMapLayers()
      .then((data) => {
        if (data && ((data.corridors && data.corridors.length > 0) || (data.defects && data.defects.length > 0))) {
          setMapData({
            corridors: data.corridors?.length ? data.corridors : DEFAULT_CORRIDORS,
            defects: data.defects?.length ? data.defects : DEFAULT_DEFECTS,
          });
        }
      })
      .catch((err) => {
        console.warn('Backend map data unavailable, using initial testbed layers:', err);
      });
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const container = mapContainerRef.current as any;
    if (container._leaflet_id) {
      container._leaflet_id = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [16.8300, 81.5200],
      zoom: 13,
      zoomControl: true,
      preferCanvas: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const layersGroup = L.featureGroup().addTo(map);
    layersGroupRef.current = layersGroup;
    mapInstanceRef.current = map;

    // Invalidate size to guarantee correct rendering on screen load & resize
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
      layersGroupRef.current = null;
    };
  }, []);

  // Update symbols and markers when mapData or filter changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. Draw Corridors as Symbols (e.g. Triangle, Diamond, Square) instead of lines
    mapData.corridors.forEach((corr) => {
      if (filterAuth !== 'ALL') {
        if (filterAuth === 'NHAI' && corr.hierarchy !== 'NH') return;
        if (filterAuth === 'PWD' && corr.hierarchy !== 'SH') return;
        if (filterAuth === 'MUNICIPAL' && !['WARD', 'URBAN'].includes(corr.hierarchy)) return;
      }

      // Compute location for the corridor symbol (midpoint between start & end)
      const lat = (corr.start[0] + corr.end[0]) / 2;
      const lon = (corr.start[1] + corr.end[1]) / 2;

      const label = corr.hierarchy === 'NH' ? 'NH-16' : corr.hierarchy === 'SH' ? 'SVEC Rd' : 'Ward 5';
      const icon = createSymbolIcon(corr.hierarchy, label);

      const marker = L.marker([lat, lon], { icon }).addTo(group);

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #0f172a; padding: 4px;">
          <strong style="font-size: 13px; color: #0284c7;">${corr.road_name}</strong><br/>
          <div style="margin-top: 4px; line-height: 1.5;">
            <strong>Symbol Type:</strong> ${corr.hierarchy === 'NH' ? 'Triangle (National Highway)' : corr.hierarchy === 'SH' ? 'Diamond (State Highway)' : 'Square (Municipal Corridor)'}<br/>
            <strong>Hierarchy:</strong> ${corr.hierarchy}<br/>
            <strong>Jurisdiction:</strong> ${corr.jurisdiction || corr.responsible_authority}<br/>
            <strong>Health Score:</strong> ${corr.health_score} / 100 (${corr.condition_status || 'Monitored'})<br/>
            <strong>Defects Detected:</strong> ${corr.total_defects ?? 0}
          </div>
        </div>
      `);
    });

    // 2. Draw Defect Markers
    const filteredDefects = mapData.defects.filter((d) => {
      if (filterAuth === 'ALL') return true;
      if (filterAuth === 'NHAI') return (d.responsible_authority || '').includes('NHAI');
      if (filterAuth === 'PWD') return (d.responsible_authority || '').includes('PWD');
      if (filterAuth === 'MUNICIPAL') return (d.responsible_authority || '').includes('Municipal');
      return true;
    });

    filteredDefects.forEach((d) => {
      const markerColor = (d.severity_level === 'Critical' || (d.priority_score && d.priority_score >= 70)) ? '#dc2626' :
                          (d.severity_level === 'High' || d.severity_level === 'Medium') ? '#f59e0b' : '#10b981';

      const circle = L.circleMarker([d.lat, d.lon], {
        radius: 8,
        fillColor: markerColor,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95
      }).addTo(group);

      circle.bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 12px; width: 210px; color: #0f172a; padding: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: ${markerColor}; font-size: 13px;">${d.reference_no}</strong>
            <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; font-weight: bold;">${d.severity_level || 'Distress'}</span>
          </div>
          <div style="line-height: 1.5;">
            <strong>Road:</strong> ${d.road_name || 'Corridor Point'}<br/>
            <strong>Severity:</strong> ${d.severity_level || 'Moderate'} (${((d.peak_severity || 0.5) * 100).toFixed(0)}%)<br/>
            <strong>Priority:</strong> ${d.priority_tier || 'Routine Monitoring'}<br/>
            <strong>Status:</strong> ${d.status || 'Submitted'}<br/>
            <strong>Authority:</strong> ${d.responsible_authority || 'Routing Assigned'}
          </div>
          ${d.annotated_image_url ? `<img src="${d.annotated_image_url}" style="width: 100%; height: 95px; object-fit: cover; border-radius: 6px; margin-top: 6px; border: 1px solid #cbd5e1;"/>` : ''}
        </div>
      `);
    });

  }, [mapData, filterAuth]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-950 text-slate-100">
      
      {/* Top Filter Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-4 z-20">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            <span>Interactive Pavement GIS Intelligence Map</span>
          </h2>
          <p className="text-[11px] text-slate-400">
            Geospatial Corridor Network (NH-16 Highway, State Road, and Municipal Ward Corridors)
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-2 text-xs">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400 uppercase tracking-wider font-semibold">Filter Authority:</span>
          
          <button
            onClick={() => setFilterAuth('ALL')}
            className={`px-3 py-1.5 rounded-lg font-mono transition ${
              filterAuth === 'ALL' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Corridors
          </button>

          <button
            onClick={() => setFilterAuth('NHAI')}
            className={`px-3 py-1.5 rounded-lg font-mono transition ${
              filterAuth === 'NHAI' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            NHAI (NH-16)
          </button>

          <button
            onClick={() => setFilterAuth('PWD')}
            className={`px-3 py-1.5 rounded-lg font-mono transition ${
              filterAuth === 'PWD' ? 'bg-purple-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            State PWD (SH)
          </button>

          <button
            onClick={() => setFilterAuth('MUNICIPAL')}
            className={`px-3 py-1.5 rounded-lg font-mono transition ${
              filterAuth === 'MUNICIPAL' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Municipality
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative w-full h-full min-h-[500px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" style={{ background: '#0b1120' }} />

        {/* Map Legend Overlay with Geometric Symbols */}
        <div className="absolute bottom-6 right-6 bg-slate-900/95 border border-slate-800 p-4 rounded-xl shadow-2xl z-[1000] text-xs space-y-2 backdrop-blur-md">
          <p className="font-bold text-white text-[11px] uppercase tracking-wider">Map Legend</p>
          
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block shrink-0"></span>
            <span className="text-slate-300 font-medium">Critical Distress (MPS &ge; 70)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shrink-0"></span>
            <span className="text-slate-300 font-medium">Moderate Pothole / Crack</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shrink-0"></span>
            <span className="text-slate-300 font-medium">Minor Surface Distress</span>
          </div>
          
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-sky-400 text-sm font-bold w-4 text-center">▲</span>
              <span className="text-slate-300 font-mono text-[11px]">NH-16 Bypass (NHAI)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-purple-400 text-sm font-bold w-4 text-center">◆</span>
              <span className="text-slate-300 font-mono text-[11px]">SVEC Main Road (AP PWD)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-emerald-400 text-sm font-bold w-4 text-center">■</span>
              <span className="text-slate-300 font-mono text-[11px]">Ward 5 (Municipality)</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
