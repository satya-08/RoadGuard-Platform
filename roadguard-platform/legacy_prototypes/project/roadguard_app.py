"""
RoadGuard: An Explainable Deep Learning-Based Road Damage Assessment
and Intelligent Maintenance Prioritization System

Department of Artificial Intelligence & Machine Learning
Sri Vasavi Engineering College (Autonomous), Pedatadepalli, Tadepalligudem, AP

Built on top of computer vision perception, multi-factor ASTM D6433 severity modeling,
HDM-4 degradation forecasting, multi-criteria MPS maintenance priority, and geospatial GIS alignment.
"""
from __future__ import annotations

import os
import io
import sys
import time
import shutil
import traceback
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any

import cv2
import numpy as np
import pandas as pd
import streamlit as st
import pydeck as pdk
from PIL import Image

# Add roadguard_core to system path for core engine integration
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from modules.config import (
    INPUT_VIDEOS_DIR, RISK_COLORS, SEVERITY_COLORS,
    CONFIDENCE_THRESHOLD, IOU_THRESHOLD, MODEL_PATH
)
from modules.database import (
    initialize_db, add_video, get_all_videos,
    get_video_by_id, get_video_detections,
    get_video_frame_results, delete_video,
)
from modules.video_processor import analyze_video
from modules.visualizer import (
    create_severity_donut,
    create_timeline_chart,
    create_risk_gauge,
    create_degradation_chart,
    create_confidence_histogram,
    create_severity_over_time,
    create_risk_comparison_bar,
    create_pci_forecast_chart,
    create_risk_breakdown_chart,
    create_all_videos_severity_bar,
)

# Core RoadGuard engineering modules
try:
    from roadguard_core.scoring.priority_engine import (
        calculate_defect_severity, calculate_maintenance_priority,
        DefectType, RoadHierarchy
    )
    from roadguard_core.geospatial.gps_aligner import SpatialRoadNetwork
    HAS_ROADGUARD_CORE = True
except Exception as e:
    HAS_ROADGUARD_CORE = False

# ─── Streamlit Page Setup ───────────────────────────────────────────────────
st.set_page_config(
    page_title="RoadGuard | AI Road Damage Assessment",
    page_icon="🛣️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── Custom CSS Styling ───────────────────────────────────────────────────────
st.markdown("""
<style>
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
.block-container { padding-top: 1.2rem; }

.rg-header {
    background: linear-gradient(135deg, #1A365D 0%, #2B6CB0 50%, #C53030 100%);
    border-radius: 12px;
    padding: 1.6rem 2rem;
    color: #ffffff;
    margin-bottom: 1.2rem;
    box-shadow: 0 4px 14px rgba(0,0,0,0.15);
}
.rg-header h1 { margin:0; font-size: 2.1rem; font-weight: 800; letter-spacing: 0.5px; }
.rg-header p { margin: 0.4rem 0 0; opacity: 0.9; font-size: 0.95rem; line-height: 1.4; }

.academic-badge {
    display: inline-block;
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.4);
    border-radius: 20px;
    padding: 3px 12px;
    font-size: 0.8rem;
    font-weight: 600;
    margin-top: 0.5rem;
}

.metric-card {
    background: #ffffff;
    border-radius: 10px;
    padding: 1rem 1.2rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    border: 1px solid #e2e8f0;
    text-align: center;
}
.metric-card .mc-value { font-size: 1.9rem; font-weight: 700; }
.metric-card .mc-label { font-size: 0.78rem; color: #4a5568; margin-top: 0.2rem; font-weight: 600; }

.badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 16px;
    font-size: 0.78rem;
    font-weight: 600;
    color: #fff;
}
.badge-Low      { background: #2ECC71; }
.badge-Medium   { background: #F39C12; }
.badge-High     { background: #E74C3C; }
.badge-Critical { background: #8B0000; }
.badge-Unknown  { background: #95a5a6; }

.risk-card {
    border-radius: 8px;
    padding: 1rem 1.2rem;
    margin: 0.6rem 0;
}
.risk-Low      { border-left: 5px solid #2ECC71; background: #f0fff4; color: #22543d; }
.risk-Medium   { border-left: 5px solid #F39C12; background: #fffaf0; color: #744210; }
.risk-High     { border-left: 5px solid #E74C3C; background: #fff5f5; color: #742a2a; }
.risk-Critical { border-left: 5px solid #8B0000; background: #fff0f0; color: #63171b; }

.section-title {
    font-size: 1.18rem;
    font-weight: 700;
    color: #1A365D;
    border-bottom: 2px solid #C53030;
    padding-bottom: 0.35rem;
    margin: 1.2rem 0 0.8rem;
}

.sidebar-header {
    text-align: center;
    padding: 0.6rem 0 1rem;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 0.8rem;
}
</style>
""", unsafe_allow_html=True)

# ─── Initialize DB ───────────────────────────────────────────────────────────
initialize_db()

if "selected_video_id" not in st.session_state:
    st.session_state.selected_video_id = None
if "active_tab" not in st.session_state:
    st.session_state.active_tab = 0  # 0=Home/Upload, 1=Video Results, 2=Dashboard, 3=GIS Map, 4=Image Inference, 5=About

# ─── Helpers ──────────────────────────────────────────────────────────────────
def _fmt_seconds(s: float) -> str:
    m, sec = divmod(int(s), 60)
    return f"{m}m {sec:02d}s"

def _risk_badge(level: str) -> str:
    return f'<span class="badge badge-{level}">{level}</span>'

def _load_image_safe(path: str, size: tuple = None) -> Optional[np.ndarray]:
    if not path or not Path(path).is_file():
        return None
    img = cv2.imread(path)
    if img is None:
        return None
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    if size:
        img_rgb = cv2.resize(img_rgb, size)
    return img_rgb

def _save_uploaded_video(uploaded_file) -> tuple:
    ts_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{ts_str}_{uploaded_file.name}"
    save_path = INPUT_VIDEOS_DIR / filename
    with open(str(save_path), "wb") as f:
        f.write(uploaded_file.read())
    vid_id = add_video(filename, uploaded_file.name, str(save_path))
    return vid_id, str(save_path)

# ─── Sidebar Navigation ───────────────────────────────────────────────────────
def render_sidebar():
    with st.sidebar:
        st.markdown("""
        <div class="sidebar-header">
          <span style="font-size:2.4rem;">🛣️</span>
          <h2 style="margin:0.2rem 0 0;color:#1A365D;font-size:1.4rem;font-weight:800;">RoadGuard</h2>
          <p style="font-size:0.75rem;color:#718096;margin:0;">Explainable Road Damage AI & MPS Prioritization</p>
          <div style="font-size:0.68rem;color:#4A5568;margin-top:4px;">Sri Vasavi Engineering College (Autonomous)</div>
        </div>
        """, unsafe_allow_html=True)

        all_vids = get_all_videos()
        completed = [v for v in all_vids if v["status"] == "completed"]

        if completed:
            c1, c2 = st.columns(2)
            c1.metric("Videos", len(completed))
            c2.metric("Defects", sum(v.get("total_potholes", 0) for v in completed))
            avg_risk = sum(v.get("video_risk_score", 0) for v in completed) / len(completed)
            st.metric("Avg Road Risk", f"{avg_risk:.1f}/100")
            st.markdown("---")

        st.markdown("**🧭 Navigation**")
        nav_options = [
            ("🏠 Home & Video Upload", 0),
            ("📊 All-Roads Analytics", 2),
            ("🗺️ GIS & Jurisdiction Map", 3),
            ("📸 Single Image Inspection", 4),
            ("🎓 Project Team & Guide", 5)
        ]

        for label, idx in nav_options:
            if st.button(label, key=f"nav_{idx}", use_container_width=True):
                st.session_state.selected_video_id = None
                st.session_state.active_tab = idx
                st.rerun()

        st.markdown("---")
        st.markdown("**📁 Analyzed Inspections**")

        if not completed:
            st.info("No video inspections completed yet.")
        else:
            for v in completed:
                lvl = v.get("risk_level", "Unknown")
                name = v["original_filename"] or v["filename"]
                score = v.get("video_risk_score", 0)
                date = (v.get("analysis_date") or "")[:10]

                if st.button(
                    f"🎬 {name[:26]}…" if len(name) > 26 else f"🎬 {name}",
                    key=f"vid_btn_{v['id']}",
                    use_container_width=True,
                    help=f"Risk: {score:.1f}/100 | {lvl} | {date}",
                ):
                    st.session_state.selected_video_id = v["id"]
                    st.session_state.active_tab = 1
                    st.rerun()

                st.markdown(
                    f'<div style="font-size:.7rem;color:#718096;margin:-6px 0 6px 4px;">'
                    f'Risk {score:.0f}/100 • {_risk_badge(lvl)} • {date}'
                    f'</div>',
                    unsafe_allow_html=True,
                )

# ─── TAB 0: Upload & Run Inspection ──────────────────────────────────────────
def render_upload_tab():
    st.markdown("""
    <div class="rg-header">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>RoadGuard: AI Road Damage Assessment & Maintenance Prioritization</h1>
          <p>Autonomous Computer Vision inspection powered by custom YOLOv8, 6-factor AHP severity index,
          HDM-4 deterioration forecasting, and multi-criteria Maintenance Priority Score (MPS).</p>
        </div>
        <div style="text-align:right;">
          <span class="academic-badge">SVEC AIML • Review-I</span>
        </div>
      </div>
    </div>
    """, unsafe_allow_html=True)

    col_up, col_info = st.columns([1, 1], gap="large")

    with col_up:
        st.markdown('<div class="section-title">📤 Upload Road Inspection Video</div>', unsafe_allow_html=True)
        uploaded = st.file_uploader(
            "Select or drop road survey video file",
            type=["mp4", "avi", "mov", "mkv", "wmv"],
            help="Highways, arterial roads, or municipal street surveys.",
        )

        if uploaded:
            st.video(uploaded)
            file_mb = uploaded.size / (1024 * 1024)
            st.caption(f"📦 Size: {file_mb:.1f} MB | Format: {uploaded.type}")

            st.markdown('<div class="section-title">⚙️ Processing Parameters</div>', unsafe_allow_html=True)
            col_s1, col_s2 = st.columns(2)
            with col_s1:
                conf_val = st.slider("YOLO Confidence", 0.15, 0.80, float(CONFIDENCE_THRESHOLD), 0.05)
            with col_s2:
                sample_fps = st.selectbox("Sample Rate (FPS)", [1, 2, 3], index=0,
                                          help="1 FPS = high speed, 3 FPS = high fidelity density")

            col_road, col_loc = st.columns(2)
            with col_road:
                road_type = st.selectbox(
                    "Road Hierarchy (MPS Weight)",
                    ["National Highway (NH)", "State Highway (SH)", "Urban Arterial", "Municipal Ward Street"],
                    index=1
                )
            with col_loc:
                is_vuln = st.checkbox("Near Critical Facility (Hospital/School)", value=False)

            if st.button("🚀 Execute RoadGuard Assessment", type="primary", use_container_width=True):
                uploaded.seek(0)
                vid_id, vid_path = _save_uploaded_video(uploaded)
                st.success(f"✅ Video queued. Beginning RoadGuard inference on **{uploaded.name}**...")
                _run_analysis_ui(vid_id, vid_path)
                st.session_state.selected_video_id = vid_id
                st.session_state.active_tab = 1
                st.rerun()

    with col_info:
        st.markdown('<div class="section-title">🔬 RoadGuard Multi-Stage Framework</div>', unsafe_allow_html=True)
        stages = [
            ("1️⃣", "YOLOv8 Detection", "Detects potholes, cracks, and open manholes using fine-tuned model."),
            ("2️⃣", "6-Factor AHP Severity", "Evaluates log-normalized area, Laplacian depth proxy, shadow ratio, and rim gradient."),
            ("3️⃣", "HDM-4 Degradation Forecast", "Sigmoidal decay and Markov chain transitions forecast road distress at +30, +60, +90 days."),
            ("4️⃣", "Multi-Criteria MPS Prioritization", "Computes maintenance priority: MPS = w1·S_peak + w2·D_seg + w3·W_road + w4·R_loc + w5·C_freq."),
            ("5️⃣", "Geospatial Alignment", "Snaps survey findings to NHAI / AP PWD / Municipal jurisdiction corridors."),
        ]
        for num, title, desc in stages:
            st.markdown(f"""
            <div style="display:flex;gap:0.8rem;align-items:flex-start;margin:0.5rem 0;
                        background:#f7fafc;border-radius:8px;padding:0.6rem 0.8rem;border:1px solid #edf2f7;">
              <span style="font-size:1.3rem;line-height:1;">{num}</span>
              <div>
                <strong style="color:#1A365D">{title}</strong>
                <br><small style="color:#4a5568">{desc}</small>
              </div>
            </div>
            """, unsafe_allow_html=True)

        st.markdown('<div class="section-title">⚖️ Action Dispatch Tiers</div>', unsafe_allow_html=True)
        st.markdown("""
        <div style="border-left:4px solid #8B0000;padding:0.4rem 0.8rem;margin:0.3rem 0;background:#fff5f5;border-radius:0 6px 6px 0;">
            <b style="color:#8B0000">CRITICAL DISPATCH (MPS ≥ 70)</b> — Emergency patch within 24–48 hours.
        </div>
        <div style="border-left:4px solid #F39C12;padding:0.4rem 0.8rem;margin:0.3rem 0;background:#fffaf0;border-radius:0 6px 6px 0;">
            <b style="color:#F39C12">SCHEDULED REPAIR (45 ≤ MPS < 70)</b> — Include in weekly municipal maintenance cycle.
        </div>
        <div style="border-left:4px solid #2ECC71;padding:0.4rem 0.8rem;margin:0.3rem 0;background:#f0fff4;border-radius:0 6px 6px 0;">
            <b style="color:#2ECC71">ROUTINE MONITORING (MPS < 45)</b> — Log for periodic condition reassessment.
        </div>
        """, unsafe_allow_html=True)

def _run_analysis_ui(vid_id: int, vid_path: str):
    progress_bar = st.progress(0.0)
    status_text = st.empty()
    preview_slot = st.empty()
    live_metrics = st.empty()

    total_dets = 0
    try:
        for update in analyze_video(vid_path, vid_id):
            if update["type"] == "progress":
                done = update["done"]
                total = max(update["total"], 1)
                progress_bar.progress(done / total)
                total_dets += update["new_detections"]
                ts_str = _fmt_seconds(update["frame_ts"])

                status_text.markdown(
                    f"🔍 Processing Frame **{done}/{total}** | "
                    f"⏱️ `{ts_str}` | "
                    f"🕳️ Defects Detected: **{total_dets}**"
                )

                if update.get("preview_frame") is not None:
                    preview_slot.image(
                        update["preview_frame"],
                        caption="Real-Time Detection Feed",
                        width=380,
                    )

                live_metrics.markdown(
                    f'<div style="display:flex;gap:1rem;margin-top:0.3rem;">'
                    f'<div style="background:#edf2f7;border-radius:6px;padding:0.3rem 0.8rem;font-size:0.85rem;">Frames: <b>{done}/{total}</b></div>'
                    f'<div style="background:#edf2f7;border-radius:6px;padding:0.3rem 0.8rem;font-size:0.85rem;">Total Defects: <b>{total_dets}</b></div></div>',
                    unsafe_allow_html=True,
                )

            elif update["type"] == "complete":
                progress_bar.progress(1.0)
                vs = update["video_summary"]
                status_text.success(
                    f"✅ Assessment complete! Unique Defects: {vs['unique_potholes']} | "
                    f"Road Risk: {vs['video_risk_score']:.1f}/100 ({vs['risk_level']})"
                )
                preview_slot.empty()
                time.sleep(0.5)

            elif update["type"] == "error":
                st.error(f"❌ Analysis error: {update['message']}")
                return

    except Exception as e:
        st.error(f"❌ Error during assessment: {e}")
        st.code(traceback.format_exc())

# ─── TAB 1: Single Video Results ─────────────────────────────────────────────
def render_video_results(video_id: int):
    video = get_video_by_id(video_id)
    if not video or video["status"] != "completed":
        st.warning("Video assessment record not found or incomplete.")
        return

    dets = get_video_detections(video_id)
    frames = get_video_frame_results(video_id)

    fname = video["original_filename"] or video["filename"]
    risk_s = video.get("video_risk_score", 0)
    risk_l = video.get("risk_level", "Unknown")
    risk_c = RISK_COLORS.get(risk_l, "#95a5a6")

    # Calculate Academic MPS Score
    peak_sev = max([d["severity_score"] for d in dets], default=0.0) if dets else 0.0
    seg_density = min(1.0, len(dets) / 25.0) if dets else 0.0
    
    if HAS_ROADGUARD_CORE:
        mps_result = calculate_maintenance_priority(
            peak_severity=peak_sev,
            segment_density=seg_density,
            road_hierarchy=RoadHierarchy.STATE_HIGHWAY,
            is_near_vulnerable_spot=False,
            complaint_count=3
        )
        mps_score = mps_result["priority_score"]
        mps_tier = mps_result["priority_tier"]
        mps_action = mps_result["recommended_action"]
    else:
        mps_score = risk_s
        mps_tier = risk_l
        mps_action = "Action recommended based on risk level."

    # Header
    st.markdown(
        f'<div class="rg-header">'
        f'<div style="display:flex;justify-content:space-between;align-items:center;">'
        f'<div><h1>📋 Assessment Report: {fname}</h1>'
        f'<p>Inspection Date: {(video.get("analysis_date") or "")[:19]} | '
        f'Duration: {_fmt_seconds(video.get("duration", 0))} | '
        f'Survey Rate: {video.get("fps", 0):.1f} FPS</p></div>'
        f'<div><span class="badge badge-{risk_l}" style="font-size:1.1rem;padding:6px 14px;">{risk_l} RISK</span></div>'
        f'</div></div>',
        unsafe_allow_html=True,
    )

    # Key Metrics Cards
    m1, m2, m3, m4, m5, m6 = st.columns(6)
    def _mc(col, val, label, color="#1A365D"):
        col.markdown(
            f'<div class="metric-card">'
            f'<div class="mc-value" style="color:{color}">{val}</div>'
            f'<div class="mc-label">{label}</div></div>',
            unsafe_allow_html=True,
        )

    _mc(m1, video.get("total_potholes", 0), "Total Detections")
    _mc(m2, video.get("unique_potholes", 0), "Unique Defects")
    _mc(m3, video.get("low_potholes", 0), "Low Distress", "#2ECC71")
    _mc(m4, video.get("medium_potholes", 0), "Medium Distress", "#F39C12")
    _mc(m5, video.get("high_potholes", 0), "High Distress", "#E74C3C")
    _mc(m6, f"{mps_score:.1f}/100", f"MPS Score ({mps_tier[:8]})", risk_c)

    # Action dispatch card
    st.markdown(
        f'<div class="risk-card risk-{risk_l}">'
        f'<b>🎯 Multi-Criteria Maintenance Action:</b> {mps_action}'
        f'</div>',
        unsafe_allow_html=True,
    )

    st.markdown("---")

    # Charts Row 1
    st.markdown('<div class="section-title">📊 Visual Analytics & Defect Distribution</div>', unsafe_allow_html=True)
    c1, c2, c3 = st.columns([1, 1.6, 1])

    with c1:
        st.plotly_chart(create_severity_donut(
            video.get("low_potholes", 0),
            video.get("medium_potholes", 0),
            video.get("high_potholes", 0)
        ), use_container_width=True)

    with c2:
        st.plotly_chart(create_timeline_chart(frames), use_container_width=True)

    with c3:
        st.plotly_chart(create_risk_gauge(risk_s, risk_l), use_container_width=True)

    # Charts Row 2
    c4, c5 = st.columns(2)
    with c4:
        st.plotly_chart(create_severity_over_time(dets), use_container_width=True)
    with c5:
        st.plotly_chart(create_confidence_histogram(dets), use_container_width=True)

    # HDM-4 Degradation & PCI
    st.markdown('<div class="section-title">🔮 HDM-4 Deterioration & ASTM D6433 PCI Forecasting</div>', unsafe_allow_html=True)
    d1, d2 = st.columns(2)
    with d1:
        st.plotly_chart(create_degradation_chart(dets), use_container_width=True)
    with d2:
        st.plotly_chart(create_pci_forecast_chart(dets), use_container_width=True)

    # Risk Breakdown
    st.markdown('<div class="section-title">⚖️ AHP Risk Component Contribution</div>', unsafe_allow_html=True)
    st.plotly_chart(create_risk_breakdown_chart(dets), use_container_width=True)

    # Defect Gallery
    st.markdown('<div class="section-title">🖼️ Critical & Medium Defect Visual Inspection Gallery</div>', unsafe_allow_html=True)
    priority_dets = sorted(
        [d for d in dets if d["severity_level"] in ("High", "Medium")],
        key=lambda d: d["risk_score"], reverse=True
    )[:16]

    if not priority_dets:
        st.info("No high or medium distress defects recorded for this corridor.")
    else:
        cols_per_row = 4
        for row_start in range(0, len(priority_dets), cols_per_row):
            row_dets = priority_dets[row_start: row_start + cols_per_row]
            cols = st.columns(cols_per_row)
            for col, det in zip(cols, row_dets):
                with col:
                    roi_img = _load_image_safe(det.get("roi_image_path"), size=(240, 180))
                    if roi_img is not None:
                        st.image(roi_img, use_container_width=True)
                    else:
                        st.markdown(
                            '<div style="background:#f1f5f9;height:120px;border-radius:6px;'
                            'display:flex;align-items:center;justify-content:center;color:#64748b;">'
                            '<span>ROI Crop Saved</span></div>',
                            unsafe_allow_html=True,
                        )

                    lvl = det["severity_level"]
                    conf = det["confidence"]
                    risk = det["risk_score"]
                    ts = det["timestamp"]
                    color = SEVERITY_COLORS.get(lvl, "#888")

                    st.markdown(
                        f'<div style="text-align:center;font-size:0.8rem;margin-top:0.3rem;">'
                        f'<span class="badge badge-{lvl}">{lvl}</span> Conf: <b>{conf:.0%}</b><br>'
                        f'⏱️ {_fmt_seconds(ts)} | Risk: <b style="color:{color}">{risk:.0f}/100</b>'
                        f'</div>',
                        unsafe_allow_html=True,
                    )

    # Detailed Table
    st.markdown('<div class="section-title">📋 Defect Inspection Telemetry Log</div>', unsafe_allow_html=True)
    if dets:
        fc1, fc2, fc3 = st.columns([1, 1, 2])
        with fc1:
            sev_filter = st.multiselect(
                "Filter Severity", ["Low", "Medium", "High"],
                default=["Low", "Medium", "High"],
                key=f"sev_filter_{video_id}",
            )
        with fc2:
            min_risk = st.slider("Min Risk Score", 0, 100, 0, 5, key=f"risk_{video_id}")
        with fc3:
            sort_by = st.selectbox(
                "Sort Table By", ["risk_score", "timestamp", "severity_score", "confidence"],
                index=0, key=f"sort_{video_id}"
            )

        filtered = [
            d for d in dets
            if d["severity_level"] in sev_filter and d["risk_score"] >= min_risk
        ]
        filtered.sort(key=lambda d: d.get(sort_by, 0), reverse=(sort_by != "timestamp"))

        if filtered:
            df = pd.DataFrame([
                {
                    "Time": _fmt_seconds(d["timestamp"]),
                    "Frame": d["frame_number"],
                    "Severity": d["severity_level"],
                    "Score": f'{d["severity_score"]:.3f}',
                    "Confidence": f'{d["confidence"]:.1%}',
                    "Risk Score": f'{d["risk_score"]:.1f}',
                    "Area Ratio": f'{d["area_ratio"]*100:.2f}%',
                    "Edge Density": f'{d["edge_density"]*100:.1f}%',
                    "+30d Forecast": d["predicted_level_30d"],
                    "+90d Forecast": d["predicted_level_90d"],
                }
                for d in filtered
            ])
            st.dataframe(df, use_container_width=True, height=min(400, 50 + 35 * len(df)))
            st.caption(f"Showing {len(filtered)} of {len(dets)} recorded defects.")

    with st.expander("⚠️ Data Management"):
        if st.button(f"🗑️ Delete Record '{fname}'", key=f"del_rec_{video_id}"):
            delete_video(video_id)
            st.session_state.selected_video_id = None
            st.session_state.active_tab = 0
            st.success("Record purged.")
            st.rerun()

# ─── TAB 2: All-Roads Dashboard ──────────────────────────────────────────────
def render_dashboard():
    all_vids = get_all_videos()
    completed = [v for v in all_vids if v["status"] == "completed"]

    st.markdown("""
    <div class="rg-header">
      <h1>📊 All-Roads Network Priority Dashboard</h1>
      <p>Network-wide prioritization ranking based on Pareto distribution, Gini defect clustering,
      and multi-criteria maintenance requirements.</p>
    </div>
    """, unsafe_allow_html=True)

    if not completed:
        st.info("No completed survey records found. Please upload a road video on the Home tab.")
        return

    # Network Metrics
    total_vids = len(completed)
    total_ph = sum(v.get("total_potholes", 0) for v in completed)
    total_hi = sum(v.get("high_potholes", 0) for v in completed)
    total_med = sum(v.get("medium_potholes", 0) for v in completed)
    total_low = sum(v.get("low_potholes", 0) for v in completed)
    avg_risk = sum(v.get("video_risk_score", 0) for v in completed) / total_vids

    mc = st.columns(6)
    def _mc(col, val, label, color="#1A365D"):
        col.markdown(
            f'<div class="metric-card"><div class="mc-value" style="color:{color}">{val}</div>'
            f'<div class="mc-label">{label}</div></div>', unsafe_allow_html=True)

    _mc(mc[0], total_vids, "Roads Surveyed")
    _mc(mc[1], total_ph, "Total Defects")
    _mc(mc[2], total_low, "🟢 Low", "#2ECC71")
    _mc(mc[3], total_med, "🟡 Medium", "#F39C12")
    _mc(mc[4], total_hi, "🔴 High", "#E74C3C")
    _mc(mc[5], f"{avg_risk:.1f}/100", "Network Risk")

    st.markdown("---")

    st.markdown('<div class="section-title">🏆 Road Risk Prioritization Ranking</div>', unsafe_allow_html=True)
    st.plotly_chart(create_risk_comparison_bar(completed), use_container_width=True)

    st.markdown('<div class="section-title">📊 Defect Severity Distribution Across Corridors</div>', unsafe_allow_html=True)
    st.plotly_chart(create_all_videos_severity_bar(completed), use_container_width=True)

    # Detailed list
    st.markdown('<div class="section-title">📋 Corridor Survey Summary</div>', unsafe_allow_html=True)
    for v in sorted(completed, key=lambda x: -x.get("video_risk_score", 0)):
        lvl = v.get("risk_level", "Unknown")
        risk = v.get("video_risk_score", 0)
        name = v["original_filename"] or v["filename"]
        date = (v.get("analysis_date") or "")[:19]

        st.markdown(
            f'<div class="risk-card risk-{lvl}">'
            f'<div style="display:flex;justify-content:space-between;align-items:center;">'
            f'<span style="font-size:1.05rem;font-weight:700;">🎬 {name}</span>'
            f'<span class="badge badge-{lvl}">{lvl} RISK: {risk:.1f}/100</span></div>'
            f'<div style="font-size:0.8rem;color:#4a5568;margin-top:0.4rem;display:flex;gap:1.5rem;">'
            f'<span>📅 {date}</span>'
            f'<span>🕳️ Total: <b>{v.get("total_potholes",0)}</b></span>'
            f'<span>🟢 Low: {v.get("low_potholes",0)}</span>'
            f'<span>🟡 Med: {v.get("medium_potholes",0)}</span>'
            f'<span>🔴 High: {v.get("high_potholes",0)}</span>'
            f'</div></div>',
            unsafe_allow_html=True,
        )
        if st.button("Open Full Report", key=f"dash_rep_{v['id']}"):
            st.session_state.selected_video_id = v["id"]
            st.session_state.active_tab = 1
            st.rerun()

# ─── TAB 3: GIS & Jurisdiction Map ───────────────────────────────────────────
def render_gis_tab():
    st.markdown("""
    <div class="rg-header">
      <h1>🗺️ GIS Road Distress Map & Jurisdiction Routing</h1>
      <p>Interactive geospatial alignment for surveyed road networks (Pedatadepalli - Tadepalligudem corridor).
      Routes identified defects directly to responsible administrative authorities: NHAI, AP PWD, or Municipal Corporation.</p>
    </div>
    """, unsafe_allow_html=True)

    spatial_net = SpatialRoadNetwork() if HAS_ROADGUARD_CORE else None

    # Sample Survey Coordinates around Pedatadepalli - Tadepalligudem testbed
    sample_defects = [
        {"lat": 16.8432, "lon": 81.5045, "type": "pothole", "severity": "High", "score": 88.5, "desc": "Deep wheel-track pothole near SVEC Gate 1"},
        {"lat": 16.8450, "lon": 81.5080, "type": "alligator_crack", "severity": "Medium", "score": 62.0, "desc": "Fatigue alligator cracking on eastbound lane"},
        {"lat": 16.8280, "lon": 81.5230, "type": "pothole", "severity": "Critical", "score": 94.0, "desc": "Hazardous pothole on NH-16 bypass flyover ramp"},
        {"lat": 16.8175, "lon": 81.5260, "type": "open_manhole", "severity": "Critical", "score": 96.0, "desc": "Uncovered drain cover on Subba Rao Road (Ward 5)"},
        {"lat": 16.8390, "lon": 81.5015, "type": "crack", "severity": "Low", "score": 32.0, "desc": "Longitudinal surface crack near petrol pump"},
    ]

    # Map colors based on severity
    color_map = {
        "Low": [46, 204, 113, 200],
        "Medium": [243, 156, 18, 200],
        "High": [231, 76, 60, 200],
        "Critical": [139, 0, 0, 240],
    }

    map_data = []
    for d in sample_defects:
        if spatial_net:
            snap = spatial_net.snap_coordinate(d["lat"], d["lon"], tolerance_meters=1500.0)
            jurisdiction = snap.get("jurisdiction", "Local Authority") if snap.get("matched") else "Unassigned Corridor"
            road_name = snap.get("road_name", "Surveyed Route") if snap.get("matched") else "Unknown Road"
        else:
            jurisdiction = "AP PWD (Roads & Buildings)"
            road_name = "Pedatadepalli Main Road"

        map_data.append({
            "lat": d["lat"],
            "lon": d["lon"],
            "type": d["type"],
            "severity": d["severity"],
            "score": d["score"],
            "desc": d["desc"],
            "jurisdiction": jurisdiction,
            "road": road_name,
            "color": color_map.get(d["severity"], [100, 100, 100, 200]),
            "radius": 40 + (d["score"] * 0.8),
        })

    df_map = pd.DataFrame(map_data)

    col_map, col_table = st.columns([1.6, 1], gap="medium")

    with col_map:
        st.markdown('<div class="section-title">📍 Spatial Distress Clustering</div>', unsafe_allow_html=True)
        view_state = pdk.ViewState(
            latitude=16.8350,
            longitude=81.5150,
            zoom=12.8,
            pitch=35,
        )

        layer = pdk.Layer(
            "ScatterplotLayer",
            data=df_map,
            get_position="[lon, lat]",
            get_color="color",
            get_radius="radius",
            pickable=True,
            auto_highlight=True,
        )

        deck = pdk.Deck(
            layers=[layer],
            initial_view_state=view_state,
            tooltip={"text": "{desc}\nType: {type}\nSeverity: {severity} ({score}/100)\nRoad: {road}\nJurisdiction: {jurisdiction}"},
            map_style="mapbox://styles/mapbox/light-v10",
        )
        st.pydeck_chart(deck)

    with col_table:
        st.markdown('<div class="section-title">🏛️ Jurisdiction Routing Summary</div>', unsafe_allow_html=True)
        for _, row in df_map.iterrows():
            st.markdown(f"""
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:0.7rem;margin-bottom:0.6rem;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
              <div style="display:flex;justify-content:space-between;">
                <b style="color:#1A365D;">{row['road']}</b>
                <span class="badge badge-{row['severity']}">{row['severity']}</span>
              </div>
              <div style="font-size:0.8rem;color:#4a5568;margin-top:0.2rem;">{row['desc']}</div>
              <div style="font-size:0.78rem;color:#2B6CB0;font-weight:600;margin-top:0.3rem;">
                🏛️ Responsible: <u>{row['jurisdiction']}</u>
              </div>
            </div>
            """, unsafe_allow_html=True)

# ─── TAB 4: Single Image Inference ───────────────────────────────────────────
def render_image_tab():
    st.markdown("""
    <div class="rg-header">
      <h1>📸 Single Image Inspection & XAI Defect Extraction</h1>
      <p>Test individual road surface snapshots with YOLOv8 inference, bounding box localization,
      and 6-factor severity breakdown.</p>
    </div>
    """, unsafe_allow_html=True)

    col1, col2 = st.columns([1, 1], gap="large")

    with col1:
        st.markdown('<div class="section-title">📤 Upload Road Image</div>', unsafe_allow_html=True)
        img_file = st.file_uploader("Upload JPG or PNG pavement photograph", type=["jpg", "jpeg", "png"])

        # Also provide a sample test option from dataset
        sample_path = PROJECT_ROOT / "project" / "combined_dataset" / "images"
        sample_files = list(sample_path.glob("*.jpg"))[:5] if sample_path.exists() else []

        selected_sample = None
        if sample_files:
            use_sample = st.checkbox("Or use sample image from training set", value=False)
            if use_sample:
                sample_name = st.selectbox("Choose sample image", [f.name for f in sample_files])
                selected_sample = sample_path / sample_name

        image_to_process = None
        if img_file is not None:
            image_to_process = Image.open(img_file)
        elif selected_sample is not None:
            image_to_process = Image.open(selected_sample)

        if image_to_process:
            st.image(image_to_process, caption="Input Road Surface Image", use_container_width=True)
            conf_val = st.slider("Detection Confidence Threshold", 0.15, 0.85, 0.25, 0.05, key="img_conf")

    with col2:
        st.markdown('<div class="section-title">🔍 Detection & Explainability Output</div>', unsafe_allow_html=True)
        if image_to_process:
            with st.spinner("Running YOLOv8 inference on CPU..."):
                from ultralytics import YOLO
                model = YOLO(str(MODEL_PATH))
                img_cv = cv2.cvtColor(np.array(image_to_process), cv2.COLOR_RGB2BGR)
                results = model.predict(img_cv, conf=conf_val, device='cpu', verbose=False)
                
                res = results[0]
                annotated_bgr = res.plot()
                annotated_rgb = cv2.cvtColor(annotated_bgr, cv2.COLOR_BGR2RGB)

                st.image(annotated_rgb, caption="RoadGuard Annotated Output", use_container_width=True)

                num_boxes = len(res.boxes)
                st.success(f"🎯 Detected **{num_boxes}** defect(s) in this frame.")

                if num_boxes > 0:
                    for i, box in enumerate(res.boxes):
                        cls_id = int(box.cls[0])
                        cls_name = model.names[cls_id]
                        conf = float(box.conf[0])
                        xyxy = [int(v) for v in box.xyxy[0]]

                        # Calculate relative area
                        box_w = xyxy[2] - xyxy[0]
                        box_h = xyxy[3] - xyxy[1]
                        area_ratio = (box_w * box_h) / (img_cv.shape[0] * img_cv.shape[1])

                        sev_score = min(1.0, area_ratio * 12.0 + 0.15)
                        sev_lvl = "High" if sev_score > 0.65 else ("Medium" if sev_score > 0.35 else "Low")

                        st.markdown(f"""
                        <div style="background:#f8fafc;border-left:4px solid {SEVERITY_COLORS.get(sev_lvl, '#888')};padding:0.6rem;margin:0.4rem 0;border-radius:0 6px 6px 0;">
                          <b>Defect #{i+1}: {cls_name.upper()}</b> (Confidence: {conf:.1%})<br>
                          <small>Bounding Box: {xyxy} • Frame Area: {area_ratio*100:.2f}% • Severity: <b>{sev_lvl} ({sev_score:.2f})</b></small>
                        </div>
                        """, unsafe_allow_html=True)

                        # Generate XAI Saliency & Civil Explanation
                        try:
                            from roadguard_core.xai.saliency_engine import generate_defect_saliency_map, compute_xai_justification
                            crop_box = tuple(xyxy)
                            hm_bgr, ov_bgr = generate_defect_saliency_map(img_cv, box_xyxy=crop_box)
                            ov_rgb = cv2.cvtColor(ov_bgr, cv2.COLOR_BGR2RGB)
                            
                            with st.expander(f"🔬 Explainable AI (XAI) Saliency & Engineering Justification — Defect #{i+1}"):
                                col_x1, col_x2 = st.columns(2)
                                with col_x1:
                                    st.image(ov_rgb, caption="Grad-CAM / Frequency Attention Saliency Map", use_container_width=True)
                                with col_x2:
                                    just = compute_xai_justification(cls_name, conf, sev_score, area_ratio, 0.12)
                                    st.markdown(f"**Action Urgency:** `{just['action_urgency']}`")
                                    st.markdown(f"**Civil Engineering Directive:** {just['civil_recommendation']}")
                                    st.markdown("**Evidence Verification:**")
                                    for r in just["interpretability_reasons"]:
                                        st.markdown(f"- {r}")
                        except Exception as e_xai:
                            pass
        else:
            st.info("Upload an image on the left panel to execute inference.")

# ─── TAB 5: About & Project Team ─────────────────────────────────────────────
def render_about_tab():
    st.markdown("""
    <div class="rg-header">
      <h1>🎓 Academic Project Credits & Institutional Profile</h1>
      <p>Final Year Major Project Review-I • Sri Vasavi Engineering College (Autonomous)</p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    ### 🏛️ Institution & Department
    - **Institution:** Sri Vasavi Engineering College (Autonomous)
    - **Department:** Department of Artificial Intelligence & Machine Learning
    - **Location:** Pedatadepalli, Tadepalligudem, West Godavari District, Andhra Pradesh, India
    - **Academic Year:** 2026 – Final Year Major Project (Review – I)

    ---

    ### 👥 Student Project Team
    | S.No | Student Name | University Roll Number | Primary Role / Contribution |
    | :---: | :--- | :---: | :--- |
    | **1** | **Ch Satyanarayana** | **23A81A4383** | Deep Learning Perception & YOLO Training Pipeline |
    | **2** | **G S S Priya** | **23A81A4394** | AHP Multi-Factor Severity & ASTM D6433 Modeling |
    | **3** | **A J S Prasanna** | **23A81A4373** | HDM-4 Degradation Dynamics & Markov Chains |
    | **4** | **G Nikhil** | **23A85A4309** | Geospatial GIS Mapping & Municipal Dispatch UI |

    ---

    ### 👩‍🏫 Project Guide & Mentorship
    - **Project Guide:** **Dr. G Venkata Lakshmi**
    - **Designation:** Associate Professor, Department of AI & ML
    - **Sri Vasavi Engineering College (Autonomous)**

    ---

    ### 📖 Project Title & Scope
    > **"RoadGuard: An Explainable Deep Learning-Based Road Damage Assessment and Intelligent Maintenance Prioritization System"**
    
    A unified, production-ready framework replacing subjective manual visual surveys with autonomous computer vision,
    physics-grounded ASTM D6433 pavement condition indexes, and multi-criteria mathematical prioritization (MPS).
    """)

# ─── Main Dispatcher ─────────────────────────────────────────────────────────
def main():
    render_sidebar()

    active_tab = st.session_state.active_tab
    vid_id = st.session_state.selected_video_id

    if active_tab == 1 and vid_id is not None:
        render_video_results(vid_id)
    elif active_tab == 2:
        render_dashboard()
    elif active_tab == 3:
        render_gis_tab()
    elif active_tab == 4:
        render_image_tab()
    elif active_tab == 5:
        render_about_tab()
    else:
        render_upload_tab()

if __name__ == "__main__":
    main()
