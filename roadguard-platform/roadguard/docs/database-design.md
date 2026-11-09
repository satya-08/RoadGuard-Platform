# RoadGuard Relational Database Design
**Engine Compatibility:** MySQL 8.x (Enterprise/Production) & SQLite 3.x (Zero-Configuration Local Development)  
**ORM:** SQLAlchemy 2.0 with Declarative Base & Session Pooling  

---

## 1. Entity-Relationship (ER) Overview

```mermaid
erDiagram
    USERS ||--o{ COMPLAINTS : submits
    USERS ||--o{ MAINTENANCE_TASKS : assigned_to
    ROAD_SEGMENTS ||--o{ COMPLAINTS : located_on
    ROAD_SEGMENTS ||--o{ MAINTENANCE_TASKS : belongs_to
    COMPLAINTS ||--o{ AI_DETECTIONS : contains
    COMPLAINTS ||--o| MAINTENANCE_TASKS : dispatches
    MAINTENANCE_TASKS ||--o| REPAIR_VERIFICATIONS : verified_by
    SURVEY_SESSIONS ||--o{ SURVEY_FRAMES : captures
    SURVEY_FRAMES ||--o{ AI_DETECTIONS : identifies

    USERS {
        string id PK
        string email UK
        string hashed_password
        string full_name
        string role
        string department
        boolean is_active
        datetime created_at
    }

    ROAD_SEGMENTS {
        string id PK
        string segment_code UK
        string road_name
        string road_hierarchy
        string jurisdiction
        string responsible_authority
        float start_lat
        float start_lon
        float end_lat
        float end_lon
        float length_meters
        float health_score
        string condition_status
    }

    COMPLAINTS {
        string id PK
        string reference_no UK
        string user_id FK
        text description
        string image_url
        string annotated_image_url
        string xai_heatmap_url
        float latitude
        float longitude
        string road_name
        string responsible_authority
        float peak_severity
        float priority_score
        string priority_tier
        float pci_score
        string status
        boolean is_duplicate
        datetime created_at
    }

    AI_DETECTIONS {
        string id PK
        string complaint_id FK
        string defect_class
        float confidence
        float bbox_xmin
        float bbox_ymin
        float bbox_xmax
        float bbox_ymax
        float normalized_area
        float severity_score
        string severity_level
        datetime detected_at
    }

    MAINTENANCE_TASKS {
        string id PK
        string task_code UK
        string complaint_id FK
        string assigned_authority
        string assigned_to_user_id FK
        string status
        string priority_level
        text work_instructions
        datetime created_at
    }

    REPAIR_VERIFICATIONS {
        string id PK
        string task_id FK
        string complaint_id FK
        string before_image_url
        string after_image_url
        string verification_status
        int defects_count_after
        text ai_recheck_notes
        datetime verified_at
    }
```

---

## 2. Table Specifications & Indexes

### 2.1 `users`
- Stores authentication credentials with `bcrypt` 12-round salt.
- Role-based permissions: `citizen`, `field_inspector`, `local_authority`, `municipal_authority`, `state_highway_authority`, `nhai_authority`, `maintenance_contractor`, `admin`.
- Index: `idx_users_email` (Unique).

### 2.2 `road_segments`
- Defines surveyed physical road corridors.
- Fields: `segment_code`, `road_name`, `road_hierarchy`, `jurisdiction`, `responsible_authority`, `start_lat`, `start_lon`, `end_lat`, `end_lon`, `health_score` (PCI index [0-100]).

### 2.3 `complaints`
- Stores citizen-reported and inspector-logged road distress records.
- Uniquely identified by `reference_no` (`RG-YYMMDD-XXXX`).
- Foreign keys: `user_id` &rarr; `users.id`, `matched_segment_id` &rarr; `road_segments.id`.
- Duplicate tracking: `is_duplicate`, `duplicate_of_id`, `duplicate_count`.

### 2.4 `ai_detections`
- Stores bounding box coordinates $[x_{min}, y_{min}, x_{max}, y_{max}]$ normalized to $[0.0, 1.0]$.
- Physical severity calculation score $S_i$ and categorical severity grade.

### 2.5 `maintenance_tasks`
- Dispatched contractor work orders (`WO-YYMMDD-XXXX`).
- Lifecycle status tracking: `Assigned`, `In Progress`, `Repair Completed`, `Closed`, `Reopened`.

### 2.6 `repair_verifications`
- Post-repair optical comparison record storing before/after imagery, residual defect counts, and inspector certification notes.
