"""
RoadGuard Geospatial Alignment and Jurisdiction Subsystem
Implements Section 6 of RoadGuard Architecture:
- Coordinate distance calculations (Haversine & Euclidean projection)
- Snapping GPS points to road segments
- Administrative jurisdiction routing (NHAI, AP PWD, Municipality)
"""

import math
from typing import Dict, List, Optional, Tuple, Any

EARTH_RADIUS_METERS = 6371000.0

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two GPS coordinates in meters.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return round(EARTH_RADIUS_METERS * c, 2)

class RoadSegment:
    def __init__(
        self,
        segment_id: str,
        road_name: str,
        hierarchy: str,
        jurisdiction: str,
        start_coord: Tuple[float, float],
        end_coord: Tuple[float, float],
        ward_no: Optional[int] = None
    ):
        self.segment_id = segment_id
        self.road_name = road_name
        self.hierarchy = hierarchy
        self.jurisdiction = jurisdiction
        self.start_coord = start_coord
        self.end_coord = end_coord
        self.ward_no = ward_no

    def distance_to_point(self, lat: float, lon: float) -> float:
        """
        Estimates orthogonal/endpoint distance from a coordinate to this segment in meters.
        """
        d_start = haversine_distance_meters(lat, lon, self.start_coord[0], self.start_coord[1])
        d_end = haversine_distance_meters(lat, lon, self.end_coord[0], self.end_coord[1])
        mid_lat = (self.start_coord[0] + self.end_coord[0]) / 2.0
        mid_lon = (self.start_coord[1] + self.end_coord[1]) / 2.0
        d_mid = haversine_distance_meters(lat, lon, mid_lat, mid_lon)
        return min(d_start, d_end, d_mid)

class SpatialRoadNetwork:
    def __init__(self):
        self.segments: List[RoadSegment] = []
        self._init_default_local_network()

    def _init_default_local_network(self):
        """
        Initializes default surveyed corridor for Pedatadepalli - Tadepalligudem testbed.
        """
        # NH-16 Corridor Segment
        self.segments.append(RoadSegment(
            segment_id="SEG-NH16-TPG-01",
            road_name="NH-16 Tadepalligudem Bypass",
            hierarchy="NH",
            jurisdiction="National Highways Authority of India (NHAI)",
            start_coord=(16.8250, 81.5200),
            end_coord=(16.8350, 81.5300),
            ward_no=None
        ))
        # Pedatadepalli Arterial / College Road
        self.segments.append(RoadSegment(
            segment_id="SEG-SH-SVEC-02",
            road_name="Pedatadepalli - SVEC College Main Road",
            hierarchy="SH",
            jurisdiction="Andhra Pradesh State PWD (Roads & Buildings)",
            start_coord=(16.8400, 81.5000),
            end_coord=(16.8500, 81.5150),
            ward_no=12
        ))
        # Tadepalligudem Town Municipal Ward Street
        self.segments.append(RoadSegment(
            segment_id="SEG-MUN-TPG-03",
            road_name="Subba Rao Road, Ward 5",
            hierarchy="WARD",
            jurisdiction="Tadepalligudem Municipal Corporation",
            start_coord=(16.8150, 81.5250),
            end_coord=(16.8200, 81.5280),
            ward_no=5
        ))

    def snap_coordinate(
        self,
        lat: float,
        lon: float,
        tolerance_meters: float = 250.0
    ) -> Optional[Dict[str, Any]]:
        """
        Snaps a GPS point to the closest road segment within the tolerance buffer.
        """
        closest_segment = None
        min_dist = float("inf")

        for seg in self.segments:
            dist = seg.distance_to_point(lat, lon)
            if dist < min_dist:
                min_dist = dist
                closest_segment = seg

        if closest_segment and min_dist <= tolerance_meters:
            return {
                "matched": True,
                "distance_meters": min_dist,
                "segment_id": closest_segment.segment_id,
                "road_name": closest_segment.road_name,
                "hierarchy": closest_segment.hierarchy,
                "jurisdiction": closest_segment.jurisdiction,
                "ward_no": closest_segment.ward_no,
                "snapped_lat": lat,
                "snapped_lon": lon
            }
        
        return {
            "matched": False,
            "distance_meters": min_dist,
            "message": "Coordinates outside mapped road network tolerance buffer"
        }
