import {
  User, AIAnalysisResult, SnapResult, RoadSegment, Complaint,
  MaintenanceTask, RepairVerification, DashboardStats
} from '../types';

const RAW_BASE = (import.meta as any).env?.VITE_API_BASE_URL;
const API_BASE = RAW_BASE 
  ? (RAW_BASE.endsWith('/api/v1') ? RAW_BASE : `${RAW_BASE.replace(/\/$/, '')}/api/v1`)
  : '/api/v1';

export const BACKEND_ORIGIN = RAW_BASE 
  ? RAW_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
  : 'https://roadguard-api.onrender.com';

export const DEFAULT_ROAD_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250' fill='%230f172a'><rect width='100%' height='100%' fill='%230f172a'/><path d='M60 210 L170 40 L230 40 L340 210 Z' fill='%231e293b'/><line x1='200' y1='50' x2='200' y2='90' stroke='%23f59e0b' stroke-width='4' stroke-dasharray='8,8'/><line x1='200' y1='110' x2='200' y2='190' stroke='%23f59e0b' stroke-width='4' stroke-dasharray='8,8'/><circle cx='215' cy='150' r='16' fill='%23ef4444' opacity='0.85'/><text x='200' y='230' font-family='sans-serif' font-size='12' fill='%2394a3b8' text-anchor='middle'>Road Damage Evidence</text></svg>";

export const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = DEFAULT_ROAD_IMAGE;
};

export const getMediaUrl = (path?: string): string => {
  if (!path) return DEFAULT_ROAD_IMAGE;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_ORIGIN}${cleanPath}`;
};

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('roadguard_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'Request failed';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = `Error ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // ─── AUTHENTICATION ───────────────────────────────────────────────
  async login(email: string, password: string):Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async register(data: { email: string; password: string; full_name: string; phone?: string; role?: string; department?: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async seedDemoUsers(): Promise<{ message: string; default_password: string; accounts: string[] }> {
    const res = await fetch(`${API_BASE}/auth/seed-demo-users`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  // ─── AI PRE-ANALYSIS & COMPLAINT SUBMISSION ──────────────────────
  async analyzeUpload(file: File): Promise<AIAnalysisResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/complaints/analyze-upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  async submitComplaint(data: any): Promise<Complaint> {
    const res = await fetch(`${API_BASE}/complaints/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async trackComplaint(referenceNo: string): Promise<Complaint> {
    const res = await fetch(`${API_BASE}/complaints/track/${encodeURIComponent(referenceNo)}`);
    return handleResponse(res);
  },

  async listComplaints(params?: { status?: string; authority?: string; priority?: string }): Promise<Complaint[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.authority) query.append('authority', params.authority);
    if (params?.priority) query.append('priority', params.priority);
    
    const res = await fetch(`${API_BASE}/complaints?${query.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getMyComplaints(): Promise<Complaint[]> {
    const res = await fetch(`${API_BASE}/complaints/my-complaints`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async updateComplaintStatus(id: string, status: string, rejection_reason?: string, assigned_authority?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/complaints/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ status, rejection_reason, assigned_authority }),
    });
    return handleResponse(res);
  },

  // ─── GIS & ROAD NETWORK ───────────────────────────────────────────
  async snapCoordinates(lat: number, lon: number): Promise<SnapResult> {
    const res = await fetch(`${API_BASE}/gis/snap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lon }),
    });
    return handleResponse(res);
  },

  async reverseGeocode(lat: number, lon: number): Promise<{ display_name: string; road?: string; city?: string; state?: string; full_address?: string; source: string; snap?: SnapResult }> {
    const res = await fetch(`${API_BASE}/gis/reverse-geocode?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}`);
    return handleResponse(res);
  },

  async getRoadSegments(): Promise<RoadSegment[]> {
    const res = await fetch(`${API_BASE}/gis/segments`);
    return handleResponse(res);
  },

  async getMapLayers(): Promise<{ center: [number, number]; default_zoom: number; corridors: any[]; defects: any[] }> {
    const res = await fetch(`${API_BASE}/gis/map-layers`);
    return handleResponse(res);
  },

  // ─── MAINTENANCE WORKFLOW & VERIFICATION ──────────────────────────
  async listMaintenanceTasks(statusFilter?: string): Promise<MaintenanceTask[]> {
    const url = statusFilter ? `${API_BASE}/maintenance/tasks?status_filter=${encodeURIComponent(statusFilter)}` : `${API_BASE}/maintenance/tasks`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async assignTask(data: { complaint_id: string; assigned_authority: string; target_completion_date?: string; priority_level?: string; work_instructions?: string }): Promise<MaintenanceTask> {
    const res = await fetch(`${API_BASE}/maintenance/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateTask(id: string, data: { status?: string; contractor_notes?: string }): Promise<MaintenanceTask> {
    const res = await fetch(`${API_BASE}/maintenance/tasks/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async verifyRepair(taskId: string, afterImage: File, inspectorNotes?: string): Promise<RepairVerification> {
    const formData = new FormData();
    formData.append('task_id', taskId);
    formData.append('after_image', afterImage);
    if (inspectorNotes) formData.append('inspector_notes', inspectorNotes);

    const res = await fetch(`${API_BASE}/maintenance/verify-repair`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    return handleResponse(res);
  },

  async approveVerification(verificationId: string, verification_status: string, inspector_notes?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/maintenance/verifications/${verificationId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ verification_status, inspector_notes }),
    });
    return handleResponse(res);
  },

  // ─── DASHBOARD & TELEMETRY ────────────────────────────────────────
  async getDashboardOverview(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/dashboard/overview`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // ─── ADMINISTRATION & AUDIT ───────────────────────────────────────
  async listUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getAuditLogs(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/admin/audit-logs`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getSystemHealth(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/system-health`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async toggleUserStatus(userId: string, isActive: boolean): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/status?is_active=${isActive}`, {
      method: 'PATCH',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getScoringConfig(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/scoring-config`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getMongoStatus(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/mongodb-status`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async mockGovSubmit(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/integrations/mock-authority-submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // ─── FIELD INSPECTOR & CRT CHECK ──────────────────────────────────
  async fieldInspectorCheck(formData: FormData): Promise<any> {
    const res = await fetch(`${API_BASE}/surveys/inspector-check`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    return handleResponse(res);
  },

  async fieldInspectorResolve(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/surveys/inspector-resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  }
};
