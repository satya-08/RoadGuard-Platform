import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  MapPin, 
  AlertCircle, 
  CheckSquare, 
  Wrench, 
  BarChart3, 
  LogOut, 
  LogIn, 
  User as UserIcon,
  ShieldAlert,
  FolderClock,
  Camera,
  Layers
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="bg-gradient-to-tr from-sky-600 to-indigo-600 p-2.5 rounded-xl shadow-lg group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white">Road<span className="text-sky-400">Guard</span></span>
              <p className="text-[10px] text-slate-400 font-medium">AI Pavement Distress & Maintenance Intelligence</p>
            </div>
          </Link>

          {/* Role-Aware Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-sm font-medium">
            <Link to="/map" className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Network Map</span>
            </Link>

            <Link to="/xai" className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>XAI Saliency</span>
            </Link>

            {/* Report Damage is strictly for citizens / public visitors, hidden for authorities */}
            {(!user || user.role === 'citizen') && (
              <Link to="/report" className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Report Damage</span>
              </Link>
            )}

            <Link to="/track" className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition">
              <CheckSquare className="w-4 h-4 text-sky-400" />
              <span>Track Issue</span>
            </Link>

            {/* Role-Specific Portal Links */}
            {user && user.role === 'field_inspector' && (
              <Link to="/inspection" className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-emerald-300 hover:text-white hover:bg-slate-800 transition">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Field Inspection</span>
              </Link>
            )}


            {user && user.role === 'citizen' && (
              <Link to="/citizen" className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sky-300 hover:text-white hover:bg-slate-800 transition">
                <FolderClock className="w-4 h-4 text-sky-400" />
                <span>My Grievances</span>
              </Link>
            )}

            {user && ['nhai_authority', 'state_highway_authority', 'municipal_authority', 'admin'].includes(user.role) && (
              <Link to="/authority" className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-purple-300 hover:text-white hover:bg-slate-800 transition">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span>Authority Queue</span>
              </Link>
            )}

            {user && ['maintenance_contractor', 'admin', 'nhai_authority', 'state_highway_authority', 'municipal_authority'].includes(user.role) && (
              <Link to="/maintenance" className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-orange-300 hover:text-white hover:bg-slate-800 transition">
                <Wrench className="w-4 h-4 text-orange-400" />
                <span>Work Orders</span>
              </Link>
            )}

            {user && user.role === 'admin' && (
              <Link to="/admin" className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-red-300 hover:text-white hover:bg-slate-800 transition">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>Admin Diagnostics</span>
              </Link>
            )}
          </nav>

          {/* User Profile & Authentication Controls */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden lg:block text-right">
                  <p className="text-xs font-semibold text-white flex items-center justify-end gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-sky-400" />
                    <span>{user.full_name}</span>
                  </p>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <span className="text-[10px] bg-slate-800 border border-slate-700 text-sky-300 px-1.5 py-0.2 rounded font-mono uppercase">
                      {user.role.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg border border-red-500/30 transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow transition"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-block bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
