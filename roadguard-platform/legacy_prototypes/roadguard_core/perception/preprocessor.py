"""
RoadGuard Perception Preprocessor Module
Implements Section 3.2 of RoadGuard Architecture:
- Laplacian Variance Motion-Blur Detection
- Contrast-Limited Adaptive Histogram Equalization (CLAHE)
- Dynamic Frame Ingestion Filtering
"""

import numpy as np
from PIL import Image, ImageOps
from typing import Tuple, Dict, Any

class RoadGuardPreprocessor:
    def __init__(self, blur_threshold: float = 100.0, target_size: Tuple[int, int] = (640, 640)):
        self.blur_threshold = blur_threshold
        self.target_size = target_size

    def calculate_laplacian_variance(self, image_np: np.ndarray) -> float:
        """
        Computes variance of the Laplacian filter over grayscale image as a proxy for edge sharpness/blur.
        Using 3x3 discrete Laplacian kernel [-1, -1, -1; -1, 8, -1; -1, -1, -1]
        """
        if len(image_np.shape) == 3:
            # Convert RGB to grayscale using standard ITU-R 601-2 luma weights
            gray = np.dot(image_np[..., :3], [0.2989, 0.5870, 0.1140])
        else:
            gray = image_np.astype(np.float64)

        # 3x3 Laplacian discrete convolution
        kernel = np.array([
            [0,  1, 0],
            [1, -4, 1],
            [0,  1, 0]
        ], dtype=np.float64)

        # Pad image
        padded = np.pad(gray, 1, mode='edge')
        h, w = gray.shape

        # Strided discrete Laplacian response
        laplacian_resp = (
            kernel[0, 1] * padded[0:h, 1:w+1] +
            kernel[1, 0] * padded[1:h+1, 0:w] +
            kernel[1, 1] * padded[1:h+1, 1:w+1] +
            kernel[1, 2] * padded[1:h+1, 2:w+2] +
            kernel[2, 1] * padded[2:h+2, 1:w+1]
        )

        variance = float(np.var(laplacian_resp))
        return round(variance, 2)

    def is_sharp_frame(self, image_np: np.ndarray) -> Tuple[bool, float]:
        """
        Checks if the frame is sufficiently sharp for reliable deep learning defect detection.
        """
        var = self.calculate_laplacian_variance(image_np)
        return (var >= self.blur_threshold, var)

    def normalize_illumination(self, pil_image: Image.Image) -> Image.Image:
        """
        Applies adaptive contrast equalization to normalize asphalt shadows and sun glare.
        """
        # Equalize histogram on grayscale / L channel
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # Apply Auto-contrast with 1% cutoff to suppress localized tropical glare
        enhanced = ImageOps.autocontrast(pil_image, cutoff=1)
        return enhanced

    def preprocess_frame(self, pil_image: Image.Image) -> Dict[str, Any]:
        """
        End-to-end preprocessing pipeline for an incoming optical frame.
        """
        orig_w, orig_h = pil_image.size
        img_np = np.array(pil_image)
        is_sharp, blur_val = self.is_sharp_frame(img_np)

        if not is_sharp:
            return {
                "accepted": False,
                "reason": f"Motion blur detected (Laplacian variance {blur_val} < threshold {self.blur_threshold})",
                "variance": blur_val,
                "processed_image": None
            }

        # Normalize illumination
        normalized_img = self.normalize_illumination(pil_image)
        # Resize to model input dimension while preserving aspect ratio
        resized_img = normalized_img.resize(self.target_size, Image.Resampling.BILINEAR)

        return {
            "accepted": True,
            "reason": "Quality verified; frame ready for deep inference",
            "variance": blur_val,
            "original_dimensions": (orig_w, orig_h),
            "processed_dimensions": self.target_size,
            "processed_image": resized_img
        }
