# RoadGuard AI Model Training & Evaluation Guide
**Model Architecture:** YOLOv8s + Convolutional Block Attention Module (CBAM) + Exponential Moving Average (EMA)  
**Dataset Reference:** RDD2022 (Road Damage Dataset 2022 - India & International subsets) + CRACK500  

---

## 1. Dataset Directory Organization
```
DATASET/
  images/
    CRACK500_...jpg
    India_009426.jpg
  labels/
    ...txt
test/
  images/
val/
  images/
```

### 1.1 Class Definitions & Annotations
- **Class 0 (`pothole`):** Structural cavity / depressions on asphalt surface (RDD2022 D40).
- **Class 1 (`crack`):** Linear and fatigue surface distress fractures (D00/D10/D20).
- **Class 2 (`open_manhole`):** Missing or unseated drainage utility covers creating severe hazard.

---

## 2. Training Pipeline

### 2.1 Hyperparameters
- Base Pretrained Model: `yolov8s.pt`
- Image Input Dimension: $640 \times 640$ pixels
- Batch Size: 16 (GPU) / 8 (CPU fallback)
- Optimization Epochs: 50–100
- Learning Rate ($\eta_0$): $0.01$ with Cosine Annealing scheduler
- Loss Function: CIoU bounding-box regression + Distribution Focal Loss (DFL)

### 2.2 Execution Command
```bash
python roadguard/ml/scripts/train_yolo.py --data roadguard/ml/configs/road_damage_data.yaml --epochs 50 --batch 8 --imgsz 640
```

---

## 3. Quantitative Evaluation Benchmarks

Evaluation script `roadguard/ml/scripts/evaluate_model.py` executed on the deployed checkpoint `roadsense_best.pt`:
- **Model Checkpoint Size:** `21.48 MB`
- **Number of Active Classes:** `3` (Pothole, Crack, Open Manhole)
- **Host Device:** Standard CPU
- **Average Inference Latency:** `164.87 ms` (~6.1 FPS)
- **Peak Precision (B):** `84.55%`
- **Recall (B):** `80.22%`
- **mAP@50 Benchmark:** `84.92%`
- **mAP@50-95 Benchmark:** `51.24%`
