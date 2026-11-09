# RoadGuard GIS & Autonomous Authority Routing Methodology

## 1. The Core GIS Problem
A raw GPS coordinate $(\text{lat}, \text{lon})$ identifies only a point on earth—it does not inherently determine which public works department owns, inspects, and repairs that roadway.

In India:
- A national highway bypass may be maintained by the **National Highways Authority of India (NHAI)**.
- An arterial road linking colleges and state highways is maintained by the **Andhra Pradesh State PWD (Roads & Buildings)**.
- A colony street or internal town ward is under the jurisdiction of the **Municipal Corporation**.

Misrouting citizen complaints to the wrong agency leads to bureaucratic pinball and delayed repair.

---

## 2. Mathematical Vector Snapping

RoadGuard evaluates orthogonal distance to road polyline segments using the spherical Haversine formulation:

$$d = 2 R \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos \phi_1 \cos \phi_2 \sin^2\left(\frac{\Delta \lambda}{2}\right)} \right)$$

where $R = 6,371,000 \text{ m}$ is the mean Earth radius.

### Corridor Segmentation
Each road segment $S$ is parameterized by its start and end endpoints $[(lat_1, lon_1), (lat_2, lon_2)]$ and intermediate interpolation nodes. The minimum orthogonal distance $d_{min} = \min_{i} d(p, s_i)$ is computed against all registered network segments.

---

## 3. Boundary Ambiguity Handling & Safeguards

1. **Within Tolerance ($\le 350\text{ m}$):**
   - Matches the nearest corridor.
   - Assigns road class (`NH`, `SH`, `WARD`).
   - Resolves responsible authority and sub-division.
   - Sets `requires_manual_routing = False`.

2. **Outside Tolerance ($> 350\text{ m}$):**
   - **Never fabricates an authority or guesses.**
   - Marks authority as `Unassigned / Ambiguous Jurisdiction`.
   - Routes complaint to the `Local District Collectorate / Manual Review Queue`.
   - Sets `requires_manual_routing = True`.

---

## 4. Testbed Demonstration Corridors (Pedatadepalli - Tadepalligudem)
- `SEG-NH16-TPG-01`: NH-16 Tadepalligudem Bypass &rarr; NHAI PIU Rajahmundry
- `SEG-SH-SVEC-02`: Pedatadepalli - SVEC College Main Road &rarr; AP State PWD
- `SEG-MUN-TPG-03`: Subba Rao Road, Ward 5 &rarr; Tadepalligudem Municipal Corporation
- `SEG-URB-KN-04`: K N Road Commercial Arterial &rarr; Municipal Town Planning
