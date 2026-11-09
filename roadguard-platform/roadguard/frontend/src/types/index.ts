export type UserRole = 
  | 'citizen'
  | 'field_inspector'
  | 'local_authority'
  | 'municipal_authority'
  | 'state_highway_authority'
  | 'nhai_authority'
  | 'maintenance_contractor'
  | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  department?: string;
  is_active: boolean;
  created_at: string;
}

export interface BoundingBox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface DetectionItem {
  defect_class: string;
  confidence: number;
  bbox: BoundingBox;
  normalized_area: number;
  aspect_ratio: number;
  severity_score: number;
  severity_level: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface SaliencyAnalysis {
  defect_type: string;
  confidence: string;
  severity_grade: number;
  interpretability_reasons: string[];
  action_urgency: string;
  civil_recommendation: string;
}

export interface AIAnalysisResult {
  success: boolean;
  message: string;
  total_detections: number;
  detections: DetectionItem[];
  peak_severity: number;
  overall_severity_level: 'Low' | 'Medium' | 'High' | 'Critical';
  pci_score: number;
  raw_image_url?: string;
  annotated_image_url?: string;
  xai_heatmap_url?: string;
  saliency_analysis?: SaliencyAnalysis;
  model_version: string;
  inference_time_ms: number;
  is_sharp: boolean;
  blur_variance: number;
  limitations?: string;
}

export interface SnapResult {
  matched: boolean;
  distance_meters: number;
  segment_code?: string;
  road_name?: string;
  hierarchy?: string;
  jurisdiction?: string;
  responsible_authority?: string;
  division?: string;
  ward_no?: number;
  snapped_lat?: number;
  snapped_lon?: number;
  requires_manual_routing: boolean;
  message?: string;
}

export interface RoadSegment {
  id: string;
  segment_code: string;
  road_name: string;
  road_hierarchy: string;
  jurisdiction: string;
  responsible_authority: string;
  division?: string;
  ward_number?: number;
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  length_meters: number;
  speed_limit_kmph: number;
  health_score: number;
  condition_status: string;
  total_defects: number;
}

export interface Complaint {
  id: string;
  reference_no: string;
  user_id?: string;
  description?: string;
  image_url: string;
  annotated_image_url?: string;
  xai_heatmap_url?: string;
  video_url?: string;
  latitude: number;
  longitude: number;
  address?: string;
  matched_segment_id?: string;
  road_name?: string;
  road_hierarchy?: string;
  jurisdiction?: string;
  responsible_authority?: string;
  division?: string;
  requires_manual_routing: boolean;
  peak_severity: number;
  severity_level: 'Low' | 'Medium' | 'High' | 'Critical';
  priority_score: number;
  priority_tier: 'CRITICAL_DISPATCH' | 'SCHEDULED_REPAIR' | 'ROUTINE_MONITORING';
  pci_score: number;
  status: string;
  rejection_reason?: string;
  is_duplicate: boolean;
  duplicate_count: number;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceTask {
  id: string;
  task_code: string;
  complaint_id: string;
  segment_id?: string;
  assigned_authority: string;
  assigned_to_user_id?: string;
  status: string;
  target_completion_date?: string;
  priority_level: string;
  work_instructions?: string;
  contractor_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RepairVerification {
  id: string;
  task_id: string;
  complaint_id: string;
  before_image_url: string;
  after_image_url: string;
  annotated_after_url?: string;
  verification_status: string;
  ai_confidence_after: number;
  defects_count_after: number;
  ai_recheck_notes?: string;
  inspector_notes?: string;
  verified_at: string;
}

export interface DashboardStats {
  total_complaints: number;
  unreviewed_complaints: number;
  critical_dispatches: number;
  in_progress_tasks: number;
  verified_repairs: number;
  avg_pci_network: number;
  status_distribution: { status: string; count: number }[];
  severity_distribution: { level: string; count: number }[];
  priority_distribution: { tier: string; count: number }[];
  authority_workloads: {
    authority: string;
    total_assigned: number;
    pending: number;
    in_progress: number;
    completed: number;
  }[];
  monitored_segments: number;
}
