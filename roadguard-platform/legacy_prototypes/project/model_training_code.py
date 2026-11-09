"""
RoadSense — YOLOv8s + CBAM + EMA (No Hardware Detection)
"""

def main():

    # ───────────────── USER PATHS ─────────────────
    SRC_IMAGES = r"D:\anna\content\combined_dataset\images"
    SRC_LABELS = r"D:\anna\content\combined_dataset\labels"
    OUTPUT_DIR = r"D:\anna\roadsense_output"

    TRAIN_RATIO = 0.75
    VAL_RATIO   = 0.15
    TEST_RATIO  = 0.10

    IMG_SIZE = 640
    EPOCHS   = 100
    BATCH    = 8
    DEVICE   = 0   # GPU (change to "cpu" if needed)

    SEED = 42
    PATIENCE = 30

    import os, sys, random, json, yaml, cv2, torch, shutil
    import numpy as np
    import torch.nn as nn
    from glob import glob
    from pathlib import Path
    from collections import defaultdict
    from tqdm import tqdm

    random.seed(SEED)
    np.random.seed(SEED)

    DST = os.path.join(OUTPUT_DIR, "roadsense_data")
    RUNS_DIR = os.path.join(OUTPUT_DIR, "runs")
    MODEL_YAML = os.path.join(DST, "dataset.yaml")

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ───────────── STEP 1 DATA VALIDATION ─────────────
    print("\nSTEP 1 — VALIDATING DATA")

    all_images = sorted(
        glob(f"{SRC_IMAGES}/*.jpg") +
        glob(f"{SRC_IMAGES}/*.jpeg") +
        glob(f"{SRC_IMAGES}/*.png")
    )

    valid_pairs = []
    missing = 0
    corrupt = 0

    for img_path in tqdm(all_images):

        stem = Path(img_path).stem
        lbl_path = os.path.join(SRC_LABELS, stem + ".txt")

        if not os.path.exists(lbl_path):
            missing += 1
            continue

        try:
            lines = [l.strip() for l in open(lbl_path) if l.strip()]
            if not lines:
                missing += 1
                continue
        except:
            missing += 1
            continue

        if cv2.imread(img_path) is None:
            corrupt += 1
            continue

        valid_pairs.append((img_path, lbl_path))

    print("valid:", len(valid_pairs))
    print("missing:", missing)
    print("corrupt:", corrupt)

    # ───────────── STEP 2 CLASS DETECTION ─────────────
    print("\nSTEP 2 — DETECTING CLASSES")

    id_counts = defaultdict(int)

    for _, lbl_path in valid_pairs:
        for line in open(lbl_path):

            p = line.strip().split()

            if len(p) >= 5:
                id_counts[int(p[0])] += 1

    detected_ids = sorted(id_counts.keys())

    ROAD_NAMES = {
        0:"pothole",
        1:"crack",
        2:"open_manhole",
        3:"alligator_crack",
        4:"longitudinal_crack",
        5:"transverse_crack"
    }

    class_names = [ROAD_NAMES.get(i,f"class_{i}") for i in detected_ids]
    id_remap = {old:new for new,old in enumerate(detected_ids)}
    NC = len(class_names)

    print("Classes:", class_names)

    # ───────────── STEP 3 DATASET SPLIT ─────────────
    print("\nSTEP 3 — SPLITTING DATASET")

    for split in ["train","val","test"]:
        os.makedirs(os.path.join(DST,"images",split),exist_ok=True)
        os.makedirs(os.path.join(DST,"labels",split),exist_ok=True)

    random.shuffle(valid_pairs)

    n=len(valid_pairs)
    n_test=max(1,int(n*TEST_RATIO))
    n_val=max(1,int(n*VAL_RATIO))
    n_train=n-n_val-n_test

    splits={
        "train":valid_pairs[:n_train],
        "val":valid_pairs[n_train:n_train+n_val],
        "test":valid_pairs[n_train+n_val:]
    }

    for split,pairs in splits.items():

        for idx,(img_path,lbl_path) in enumerate(tqdm(pairs)):

            stem=f"{split}_{idx:05d}"

            img=cv2.imread(img_path)
            img=cv2.resize(img,(IMG_SIZE,IMG_SIZE))

            cv2.imwrite(
                os.path.join(DST,"images",split,stem+".jpg"),
                img
            )

            with open(lbl_path) as fi,\
                 open(os.path.join(DST,"labels",split,stem+".txt"),"w") as fo:

                for line in fi:

                    p=line.strip().split()

                    if len(p)>=5:

                        new_id=id_remap[int(p[0])]

                        fo.write(
                            f"{new_id} {p[1]} {p[2]} {p[3]} {p[4]}\n"
                        )

    # ───────────── STEP 4 YAML ─────────────
    print("\nSTEP 4 — WRITING YAML")

    with open(MODEL_YAML,"w") as f:

        yaml.dump({

            "path":DST,
            "train":"images/train",
            "val":"images/val",
            "test":"images/test",
            "nc":NC,
            "names":class_names

        },f)

    # ───────────── STEP 5 ATTENTION MODULES ─────────────
    print("\nSTEP 5 — ATTENTION MODULES")

    class ChannelAttention(nn.Module):

        def __init__(self,ch,r=16):
            super().__init__()

            mid=max(1,ch//r)

            self.avg=nn.AdaptiveAvgPool2d(1)
            self.max=nn.AdaptiveMaxPool2d(1)

            self.fc=nn.Sequential(
                nn.Conv2d(ch,mid,1),
                nn.ReLU(),
                nn.Conv2d(mid,ch,1)
            )

            self.sig=nn.Sigmoid()

        def forward(self,x):
            return self.sig(self.fc(self.avg(x))+self.fc(self.max(x)))*x


    class SpatialAttention(nn.Module):

        def __init__(self,k=7):
            super().__init__()

            self.conv=nn.Conv2d(2,1,k,padding=k//2)
            self.sig=nn.Sigmoid()

        def forward(self,x):

            a=x.mean(1,keepdim=True)
            m=x.max(1,keepdim=True)[0]

            return x*self.sig(self.conv(torch.cat([a,m],1)))


    class CBAM(nn.Module):

        def __init__(self,ch):
            super().__init__()

            self.ca=ChannelAttention(ch)
            self.sa=SpatialAttention()

        def forward(self,x):

            return self.sa(self.ca(x))


    class EMA(nn.Module):

        def __init__(self,ch):
            super().__init__()

            self.pool=nn.AdaptiveAvgPool2d(1)
            self.conv=nn.Conv2d(ch,ch,1)

        def forward(self,x):

            w=torch.sigmoid(self.conv(self.pool(x)))

            return x*w

    # ───────────── STEP 6 MODEL BUILD ─────────────
    print("\nSTEP 6 — BUILD MODEL")

    from ultralytics import YOLO

    model=YOLO("yolov8s.pt")

    seq=model.model.model

    for idx in [4,6]:

        layer=seq[idx]

        ch=256

        for m in layer.modules():

            if isinstance(m,nn.Conv2d):
                ch=m.out_channels

        seq[idx]=nn.Sequential(layer,CBAM(ch))


    for idx in [12,15]:

        layer=seq[idx]

        ch=256

        for m in layer.modules():

            if isinstance(m,nn.Conv2d):
                ch=m.out_channels

        seq[idx]=nn.Sequential(layer,EMA(ch))

    # ───────────── STEP 7 TRAIN ─────────────
    print("\nSTEP 7 — TRAINING")

    results=model.train(

        data=MODEL_YAML,
        project=RUNS_DIR,
        name="roadsense_yolov8s",
        device=DEVICE,

        epochs=EPOCHS,
        imgsz=IMG_SIZE,
        batch=BATCH,
        workers=0,
        patience=PATIENCE,

        optimizer="AdamW",
        lr0=0.0005,

        mosaic=1.0,
        mixup=0.05,

        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,

        degrees=10,
        translate=0.1,
        scale=0.5,

        fliplr=0.5,

        amp=True,
        val=True,
        plots=True,
        save=True
    )

    print("Training finished")

    # ───────────── STEP 8 SAVE MODEL ─────────────
    print("\nSTEP 8 — SAVING MODEL")

    best=str(list(Path(RUNS_DIR).rglob("best.pt"))[-1])

    save_dir=os.path.join(OUTPUT_DIR,"final_model")

    os.makedirs(save_dir,exist_ok=True)

    shutil.copy(best,os.path.join(save_dir,"roadsense_best.pt"))

    print("Saved:",save_dir)


if __name__ == "__main__":

    import multiprocessing
    multiprocessing.freeze_support()

    main()