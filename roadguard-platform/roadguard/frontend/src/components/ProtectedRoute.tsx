import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogIn, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-mono">Verifying authentication token...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles required and user is not admin and not in allowedRoles
  if (allowedRoles && allowedRoles.length > 0) {
    const isAuthorized = user.role === 'admin' || allowedRoles.includes(user.role);
    if (!isAuthorized) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 p-8 rounded-2xl text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">403 &mdash; Access Restricted</h2>
              <p className="text-xs text-slate-400 mt-2">
                This portal is restricted to authorized roles:
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                {allowedRoles.map((r) => (
                  <span key={r} className="bg-slate-800 text-sky-300 border border-slate-700 px-2 py-0.5 rounded text-[11px] font-mono">
                    {r.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
              <p>Logged in as: <strong className="text-white">{user.full_name}</strong></p>
              <p className="text-slate-400 font-mono mt-0.5">Current Role: {user.role.replace(/_/g, ' ')}</p>
            </div>

            <div className="flex gap-2">
              <Link
                to="/"
                className="flex-1 flex items-center justify-center space-x-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return Home</span>
              </Link>
              <Link
                to="/login"
                className="flex-1 flex items-center justify-center space-x-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Switch Account</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
