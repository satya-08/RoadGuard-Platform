-- =====================================================================
-- RoadGuard Spatial Database Schema
-- Compatible with PostgreSQL 15+ and PostGIS 3.3+
-- Implements Section 8 of RoadGuard System Architecture
-- =====================================================================

-- 1. Enable PostGIS Spatial Extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Road Segments Entity (Spatial Network Corridors)
CREATE TABLE IF NOT EXISTS road_segments (
    segment_id VARCHAR(50) PRIMARY KEY,
    road_name VARCHAR(150) NOT NULL,
    road_hierarchy VARCHAR(50) NOT NULL, -- 'NH', 'SH', 'MDR', 'URBAN', 'WARD'
    jurisdiction VARCHAR(120) NOT NULL,  -- 'NHAI', 'AP_PWD', 'TPG_MUNICIPALITY'
    ward_number INT,
    speed_limit_kmph INT DEFAULT 40,
    segment_length_meters FLOAT DEFAULT 100.0,
    geom GEOMETRY(LineString, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_road_segments_geom ON road_segments USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_road_segments_jurisdiction ON road_segments(jurisdiction);

-- 3. Detected Defects Entity
CREATE TABLE IF NOT EXISTS detected_defects (
    defect_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    segment_id VARCHAR(50) REFERENCES road_segments(segment_id) ON DELETE SET NULL,
    defect_type VARCHAR(50) NOT NULL,    -- 'pothole', 'longitudinal_crack', etc.
    confidence FLOAT NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    bounding_box JSONB,                  -- [x_min, y_min, x_max, y_max]
    normalized_area FLOAT DEFAULT 0.0,
    aspect_ratio FLOAT DEFAULT 1.0,
    severity_score FLOAT NOT NULL CHECK (severity_score >= 0.0 AND severity_score <= 1.0),
    severity_level VARCHAR(25) NOT NULL, -- 'Low', 'Medium', 'High/Critical'
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    raw_image_path TEXT,
    xai_heatmap_path TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_detected_defects_geom ON detected_defects USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_detected_defects_segment ON detected_defects(segment_id);
CREATE INDEX IF NOT EXISTS idx_detected_defects_severity ON detected_defects(severity_score);

-- 4. Maintenance Prioritization Entity (Municipal Work Orders)
CREATE TABLE IF NOT EXISTS maintenance_priorities (
    priority_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    segment_id VARCHAR(50) REFERENCES road_segments(segment_id) ON DELETE CASCADE,
    peak_severity FLOAT NOT NULL,
    segment_density FLOAT NOT NULL,
    priority_score FLOAT NOT NULL CHECK (priority_score >= 0.0 AND priority_score <= 100.0),
    priority_tier VARCHAR(30) NOT NULL,  -- 'CRITICAL_DISPATCH', 'SCHEDULED_REPAIR', 'ROUTINE_MONITORING'
    recommended_action TEXT,
    complaint_count INT DEFAULT 0,
    dispatched_to VARCHAR(120),
    status VARCHAR(30) DEFAULT 'Pending Review', -- 'Pending Review', 'Dispatched', 'In Progress', 'Completed'
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_priorities_tier ON maintenance_priorities(priority_tier);
CREATE INDEX IF NOT EXISTS idx_maintenance_priorities_score ON maintenance_priorities(priority_score DESC);

-- 5. Seed Initial Spatial Data for Pedatadepalli - Tadepalligudem Testbed
INSERT INTO road_segments (segment_id, road_name, road_hierarchy, jurisdiction, ward_number, geom)
VALUES 
('SEG-NH16-TPG-01', 'NH-16 Tadepalligudem Bypass', 'NH', 'National Highways Authority of India (NHAI)', NULL, 
 ST_SetSRID(ST_MakeLine(ST_MakePoint(81.5200, 16.8250), ST_MakePoint(81.5300, 16.8350)), 4326))
ON CONFLICT (segment_id) DO NOTHING;

INSERT INTO road_segments (segment_id, road_name, road_hierarchy, jurisdiction, ward_number, geom)
VALUES 
('SEG-SH-SVEC-02', 'Pedatadepalli - SVEC College Main Road', 'SH', 'Andhra Pradesh State PWD (Roads & Buildings)', 12, 
 ST_SetSRID(ST_MakeLine(ST_MakePoint(81.5000, 16.8400), ST_MakePoint(81.5150, 16.8500)), 4326))
ON CONFLICT (segment_id) DO NOTHING;

INSERT INTO road_segments (segment_id, road_name, road_hierarchy, jurisdiction, ward_number, geom)
VALUES 
('SEG-MUN-TPG-03', 'Subba Rao Road, Ward 5', 'WARD', 'Tadepalligudem Municipal Corporation', 5, 
 ST_SetSRID(ST_MakeLine(ST_MakePoint(81.5250, 16.8150), ST_MakePoint(81.5280, 16.8200)), 4326))
ON CONFLICT (segment_id) DO NOTHING;
