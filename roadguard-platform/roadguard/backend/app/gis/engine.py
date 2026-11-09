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

class RoadSegmentData:
    def __init__(
        self,
        segment_code: str,
        road_name: str,
        hierarchy: str,
        jurisdiction: str,
        responsible_authority: str,
        division: Optional[str],
        start_coord: Tuple[float, float],
        end_coord: Tuple[float, float],
        ward_no: Optional[int] = None,
        length_meters: float = 1200.0
    ):
        self.segment_code = segment_code
        self.road_name = road_name
        self.hierarchy = hierarchy
        self.jurisdiction = jurisdiction
        self.responsible_authority = responsible_authority
        self.division = division
        self.start_coord = start_coord
        self.end_coord = end_coord
        self.ward_no = ward_no
        self.length_meters = length_meters

    def distance_to_point(self, lat: float, lon: float) -> float:
        """
        Calculates distance from point to road segment.
        Samples endpoints and intermediate interpolation points.
        """
        d_start = haversine_distance_meters(lat, lon, self.start_coord[0], self.start_coord[1])
        d_end = haversine_distance_meters(lat, lon, self.end_coord[0], self.end_coord[1])
        
        # Sample intermediate points along the segment
        min_dist = min(d_start, d_end)
        for i in range(1, 5):
            frac = i / 5.0
            mid_lat = self.start_coord[0] + frac * (self.end_coord[0] - self.start_coord[0])
            mid_lon = self.start_coord[1] + frac * (self.end_coord[1] - self.start_coord[1])
            d_mid = haversine_distance_meters(lat, lon, mid_lat, mid_lon)
            if d_mid < min_dist:
                min_dist = d_mid
                
        return min_dist

class GISEngine:
    def __init__(self):
        self.segments: List[RoadSegmentData] = []
        self._init_network()

    def _init_network(self):
        """
        Initializes verified road corridors for the demonstration testbed region:
        Pedatadepalli - Tadepalligudem - West Godavari, Andhra Pradesh.
        """
        # Corridor 1: NH-16 National Highway Bypass
        self.segments.append(RoadSegmentData(
            segment_code="SEG-NH16-TPG-01",
            road_name="NH-16 Tadepalligudem Bypass",
            hierarchy="NH",
            jurisdiction="National Highways Authority of India (NHAI)",
            responsible_authority="National Highways Authority of India (NHAI)",
            division="Project Implementation Unit (PIU) Rajamahendravaram",
            start_coord=(16.8250, 81.5200),
            end_coord=(16.8350, 81.5300),
            ward_no=None,
            length_meters=1500.0
        ))
        
        # Corridor 2: State Highway Pedatadepalli - SVEC Road
        self.segments.append(RoadSegmentData(
            segment_code="SEG-SH-SVEC-02",
            road_name="Pedatadepalli - SVEC College Main Road",
            hierarchy="SH",
            jurisdiction="Andhra Pradesh State PWD (Roads & Buildings)",
            responsible_authority="Andhra Pradesh State PWD (Roads & Buildings)",
            division="Tadepalligudem R&B Sub-Division",
            start_coord=(16.8400, 81.5000),
            end_coord=(16.8500, 81.5150),
            ward_no=12,
            length_meters=2100.0
        ))
        
        # Corridor 3: Tadepalligudem Municipal Town Ward Street
        self.segments.append(RoadSegmentData(
            segment_code="SEG-MUN-TPG-03",
            road_name="Subba Rao Road, Ward 5",
            hierarchy="WARD",
            jurisdiction="Tadepalligudem Municipal Corporation",
            responsible_authority="Tadepalligudem Municipal Corporation",
            division="Municipal Engineering Department",
            start_coord=(16.8150, 81.5250),
            end_coord=(16.8200, 81.5280),
            ward_no=5,
            length_meters=600.0
        ))

        # Corridor 4: KN Road Urban Arterial
        self.segments.append(RoadSegmentData(
            segment_code="SEG-URB-KN-04",
            road_name="K N Road Commercial Corridor",
            hierarchy="URBAN",
            jurisdiction="Tadepalligudem Municipal Corporation",
            responsible_authority="Tadepalligudem Municipal Corporation",
            division="Town Planning & Public Works",
            start_coord=(16.8120, 81.5270),
            end_coord=(16.8180, 81.5320),
            ward_no=3,
            length_meters=850.0
        ))

    def snap_coordinate(
        self,
        lat: float,
        lon: float,
        tolerance_meters: float = 350.0
    ) -> Dict[str, Any]:
        """
        Snaps a coordinate to the closest road segment within the spatial tolerance buffer.
        If outside tolerance, flags for manual routing without guessing.
        """
        closest_seg: Optional[RoadSegmentData] = None
        min_dist = float("inf")

        for seg in self.segments:
            d = seg.distance_to_point(lat, lon)
            if d < min_dist:
                min_dist = d
                closest_seg = seg

        if closest_seg and min_dist <= tolerance_meters:
            return {
                "matched": True,
                "distance_meters": round(min_dist, 2),
                "segment_code": closest_seg.segment_code,
                "road_name": closest_seg.road_name,
                "hierarchy": closest_seg.hierarchy,
                "jurisdiction": closest_seg.jurisdiction,
                "responsible_authority": closest_seg.responsible_authority,
                "division": closest_seg.division,
                "ward_no": closest_seg.ward_no,
                "snapped_lat": lat,
                "snapped_lon": lon,
                "requires_manual_routing": False,
                "message": f"Successfully snapped to {closest_seg.road_name} ({min_dist:.1f}m away)"
            }

        return {
            "matched": False,
            "distance_meters": round(min_dist, 2) if closest_seg else 0.0,
            "segment_code": None,
            "road_name": "Unmapped Local Road",
            "hierarchy": "UNKNOWN",
            "jurisdiction": "Unassigned / Ambiguous Jurisdiction",
            "responsible_authority": "Local District Collectorate / Manual Review Queue",
            "division": "General Administration",
            "ward_no": None,
            "snapped_lat": lat,
            "snapped_lon": lon,
            "requires_manual_routing": True,
            "message": f"Location is {min_dist:.1f}m away from surveyed network (exceeds {tolerance_meters}m tolerance). Sent to manual review."
        }

gis_engine = GISEngine()
