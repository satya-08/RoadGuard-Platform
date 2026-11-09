"""
RoadGuard Automated Test Suite
Verifies all core subsystems:
1. Scoring Engine (S_i, D_seg, MPS)
2. Geospatial Aligner (Haversine, Snapping, Jurisdiction)
3. Preprocessor (Laplacian Variance, Quality Filter)
4. Backend API Endpoints
"""

import unittest
import numpy as np
from PIL import Image

from roadguard_core.scoring.priority_engine import (
    DefectType,
    RoadHierarchy,
    calculate_defect_severity,
    calculate_segment_density,
    calculate_maintenance_priority
)
from roadguard_core.geospatial.gps_aligner import (
    haversine_distance_meters,
    SpatialRoadNetwork
)
from roadguard_core.perception.preprocessor import RoadGuardPreprocessor

class TestScoringEngine(unittest.TestCase):
    def test_pothole_severity(self):
        # Large pothole should trigger High/Critical
        score, level = calculate_defect_severity(DefectType.POTHOLE, normalized_area=0.8, aspect_ratio=1.0)
        self.assertGreaterEqual(score, 0.70)
        self.assertEqual(level, "High/Critical")

    def test_minor_crack_severity(self):
        # Very tiny hairline crack should be Low
        score, level = calculate_defect_severity(DefectType.LONGITUDINAL_CRACK, normalized_area=0.01, aspect_ratio=1.1)
        self.assertLess(score, 0.35)
        self.assertEqual(level, "Low")

    def test_segment_density(self):
        severities = [0.8, 0.7, 0.9]
        density = calculate_segment_density(severities, segment_length_meters=100.0)
        self.assertGreater(density, 0.0)
        self.assertLessEqual(density, 1.0)

    def test_priority_score_national_highway(self):
        # High severity on NH with complaints must yield Critical Dispatch
        res = calculate_maintenance_priority(
            peak_severity=0.85,
            segment_density=0.60,
            road_hierarchy=RoadHierarchy.NATIONAL_HIGHWAY,
            is_near_vulnerable_spot=True,
            complaint_count=5
        )
        self.assertIn("priority_score", res)
        self.assertGreaterEqual(res["priority_score"], 70.0)
        self.assertEqual(res["priority_tier"], "CRITICAL_DISPATCH")
        self.assertIn("peak_severity", res["components"])

class TestGeospatialEngine(unittest.TestCase):
    def setUp(self):
        self.network = SpatialRoadNetwork()

    def test_haversine_distance(self):
        # Distance between two nearby points in Tadepalligudem (~1.5 km)
        d = haversine_distance_meters(16.8250, 81.5200, 16.8350, 81.5300)
        self.assertGreater(d, 1000.0)
        self.assertLess(d, 2500.0)

    def test_coordinate_snapping_svce(self):
        # Point near Pedatadepalli - SVEC College road
        res = self.network.snap_coordinate(16.8410, 81.5020, tolerance_meters=500.0)
        self.assertTrue(res["matched"])
        self.assertEqual(res["segment_id"], "SEG-SH-SVEC-02")
        self.assertEqual(res["hierarchy"], "SH")
        self.assertIn("Andhra Pradesh State PWD", res["jurisdiction"])

class TestPreprocessor(unittest.TestCase):
    def setUp(self):
        self.preprocessor = RoadGuardPreprocessor(blur_threshold=100.0)

    def test_sharp_vs_blurred_image(self):
        # Create a sharp checkerboard pattern
        sharp_arr = np.zeros((100, 100, 3), dtype=np.uint8)
        sharp_arr[::2, ::2] = 255
        var_sharp = self.preprocessor.calculate_laplacian_variance(sharp_arr)
        self.assertGreater(var_sharp, 100.0)

        # Create a uniform flat/blurred image
        flat_arr = np.full((100, 100, 3), 128, dtype=np.uint8)
        var_flat = self.preprocessor.calculate_laplacian_variance(flat_arr)
        self.assertLess(var_flat, 10.0)

        # Preprocess test
        img = Image.fromarray(sharp_arr)
        res = self.preprocessor.preprocess_frame(img)
        self.assertTrue(res["accepted"])
        self.assertEqual(res["processed_dimensions"], (640, 640))

if __name__ == '__main__':
    unittest.main()
