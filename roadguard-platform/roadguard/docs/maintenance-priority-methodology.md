# Maintenance Prioritization & Severity Modeling Methodology

## 1. Defect Severity Index ($S_i$)
Defect severity is calculated via a multi-factor Analytic Hierarchy Process (AHP) model:

$$S_i = \frac{w_c}{3.0} \left( \alpha \sqrt{A_i} + \beta f(\text{aspect\_ratio}) + 0.1 \times \text{confidence} + 0.05 \right)$$

where:
- $w_c$: Structural hazard weight ($3.0$ for potholes, $3.2$ for open manholes, $2.0$ for cracks)
- $A_i$: Bounding box pixel area normalized to frame size $[0.0, 1.0]$
- $\alpha = 0.7, \beta = 0.3$: Geometric weights balancing cavity size and lane-spanning elongation.

---

## 2. ASTM D6433 Pavement Condition Index (PCI)
The ASTM D6433 Pavement Condition Index is derived via a nonlinear power formulation:

$$\text{PCI} = 100 \times (1 - S_{peak})^{1.7}$$

- $\text{PCI} \ge 85$: Good (Routine monitoring)
- $55 \le \text{PCI} < 85$: Satisfactory / Moderate
- $40 \le \text{PCI} < 55$: Poor
- $\text{PCI} < 40$: Serious / Critical Failure

---

## 3. HDM-4 Deterioration Dynamics & Markov Modeling
The degradation over time follows the World Bank HDM-4 sigmoidal progression:

$$s(t) = \frac{1}{1 + \left(\frac{1 - s_0}{s_0}\right) \exp(-k \times t)}$$

- $k_{low} = 0.008$: Slow surface infiltration
- $k_{med} = 0.015$: Accelerating base deterioration
- $k_{high} = 0.025$: Rapid structural failure

---

## 4. Multi-Criteria Maintenance Priority Score (MPS)
The unified dispatch score combining visual, physical, and municipal factors:

$$\text{MPS} = \omega_1 S_{peak} + \omega_2 D_{seg} + \omega_3 W_{road} + \omega_4 R_{loc} + \omega_5 C_{freq}$$

### Calibrated Weight Vector
- $\omega_1 = 0.35$: Peak Defect Severity ($S_{peak}$)
- $\omega_2 = 0.25$: Segment Distress Density ($D_{seg} = \frac{1}{L/10} \sum S_i$)
- $\omega_3 = 0.20$: Road Hierarchy Importance ($W_{road}$: NH=1.0, SH=0.85, Municipal=0.45)
- $\omega_4 = 0.10$: Vulnerable Spot Proximity ($R_{loc}$: schools, accident blackspots)
- $\omega_5 = 0.10$: Citizen Grievance Frequency ($C_{freq} = \min(1.0, \frac{\ln(1+N)}{\ln 11})$)

### Operational Action Tiers
| Tier | Score Range | Operational Directive | SLA |
| :--- | :--- | :--- | :--- |
| **CRITICAL_DISPATCH** | $\ge 70$ | Emergency road patch crew dispatch | 24–48 hours |
| **SCHEDULED_REPAIR** | $45 \le \text{MPS} < 70$ | Include in weekly municipal maintenance cycle | 7 days |
| **ROUTINE_MONITORING** | $< 45$ | Log for periodic reassessment during next survey | Quarterly |
