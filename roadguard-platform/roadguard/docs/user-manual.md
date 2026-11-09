# RoadGuard: User Manual & Role-Based Guide

## 1. Citizen Role Guide
1. **Reporting Distress:**
   - Go to `/report`.
   - Take or upload a photo of the road damage.
   - Click "Get GPS" or choose a location on the map.
   - Click "Run AI Damage Analysis" to preview the bounding box and XAI heatmap.
   - Confirm and click "Confirm & Lodge Formal Report".
2. **Tracking Progress:**
   - Save your reference number (e.g. `RG-261018-ABCD`).
   - Open `/track` anytime to see live updates, assigned authority, and post-repair photos.

---

## 2. Field Survey Inspector Guide
1. **Proactive Inspection:**
   - Ingest continuous dashcam imagery or batch photos.
   - Inspect detected defect counts, motion blur variance, and coordinate tags.
   - Flag high-risk blackspots for priority municipal review.

---

## 3. Public Works Authority Officer Guide (NHAI / State PWD / Municipality)
1. **Triage Review:**
   - Open `/authority` to review incoming grievances scoped to your jurisdiction.
   - Check defect severity, ASTM PCI rating, and Multi-Criteria Maintenance Priority Score (MPS).
2. **Work Order Dispatch:**
   - Click "Dispatch Task" to assign work to a registered asphalt maintenance contractor.
   - Specify target SLA and engineering directives.

---

## 4. Maintenance Contractor Guide
1. **Task Execution:**
   - Open `/maintenance` to review dispatched work orders.
   - Acknowledge receipt to transition status to "In Progress".
   - Complete on-site compaction or cold milling.
2. **Verification Submission:**
   - Upload clear photo evidence of the repaired asphalt patch.
   - Trigger the AI re-detection engine.
   - Await final engineer approval for ticket closure.
