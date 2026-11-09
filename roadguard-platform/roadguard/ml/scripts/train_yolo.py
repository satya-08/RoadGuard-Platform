"""
RoadGuard YOLOv8 Training Script
Supports fine-tuning on RDD2022 / Pothole / Custom road damage datasets.
"""
import argparse
from pathlib import Path

def train(data_yaml: str, epochs: int = 50, batch_size: int = 16, imgsz: int = 640):
    from ultralytics import YOLO

    print(f"Starting RoadGuard YOLOv8 training with {data_yaml} for {epochs} epochs...")
    model = YOLO("yolov8s.pt") # Base pretrained YOLOv8s

    results = model.train(
        data=data_yaml,
        epochs=epochs,
        batch=batch_size,
        imgsz=imgsz,
        save=True,
        project="roadguard_training",
        name="roadguard_yolov8_run"
    )
    print("Training complete. Best model checkpoint saved in runs.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train RoadGuard YOLO model")
    parser.add_argument("--data", type=str, default="../configs/road_damage_data.yaml")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--imgsz", type=int, default=640)
    args = parser.parse_args()

    train(args.data, args.epochs, args.batch, args.imgsz)
