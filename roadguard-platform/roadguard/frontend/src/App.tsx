import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NewComplaintPage } from './pages/NewComplaintPage';
import { ComplaintTrackingPage } from './pages/ComplaintTrackingPage';
import { InteractiveMapPage } from './pages/InteractiveMapPage';
import { CitizenPortal } from './pages/CitizenPortal';
import { AuthorityDashboard } from './pages/AuthorityDashboard';
import { MaintenanceTasksPage } from './pages/MaintenanceTasksPage';
import { FieldInspectionPage } from './pages/FieldInspectionPage';
import { ExplainableAIPage } from './pages/ExplainableAIPage';
import { YOLOv8VisionPage } from './pages/YOLOv8VisionPage';
import { AdminPage } from './pages/AdminPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/vision" element={<YOLOv8VisionPage />} />
              <Route path="/report" element={<NewComplaintPage />} />
              <Route path="/xai" element={<ExplainableAIPage />} />
              <Route path="/saliency" element={<ExplainableAIPage />} />
              <Route path="/track" element={<ComplaintTrackingPage />} />
              <Route path="/map" element={<InteractiveMapPage />} />
              
              {/* Citizen Portal (Protected) */}
              <Route
                path="/citizen"
                element={
                  <ProtectedRoute allowedRoles={['citizen', 'admin']}>
                    <CitizenPortal />
                  </ProtectedRoute>
                }
              />

              {/* Authority Command Center (Jurisdiction Scoped) */}
              <Route
                path="/authority"
                element={
                  <ProtectedRoute allowedRoles={['nhai_authority', 'state_highway_authority', 'municipal_authority', 'admin']}>
                    <AuthorityDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Field Inspector Survey & CRT Verification Check */}
              <Route
                path="/inspection"
                element={
                  <ProtectedRoute allowedRoles={['nhai_authority', 'state_highway_authority', 'municipal_authority', 'field_inspector', 'admin', 'maintenance_contractor']}>
                    <FieldInspectionPage />
                  </ProtectedRoute>
                }
              />

              {/* Maintenance Tasks & Post-Repair Verification */}
              <Route
                path="/maintenance"
                element={
                  <ProtectedRoute allowedRoles={['maintenance_contractor', 'nhai_authority', 'state_highway_authority', 'municipal_authority', 'admin', 'field_inspector']}>
                    <MaintenanceTasksPage />
                  </ProtectedRoute>
                }
              />

              {/* Central Administration & Diagnostics */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
