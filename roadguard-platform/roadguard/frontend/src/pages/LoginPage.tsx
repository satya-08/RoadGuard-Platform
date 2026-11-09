import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, LogIn, AlertCircle, Sparkles, UserPlus, X } from 'lucide-react';

interface DemoPreset {
  label: string;
  desc: string;
  email: string;
  badge: string;
  role: string;
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // State for the authority action popup
  const [selectedPreset, setSelectedPreset] = useState<DemoPreset | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    // Pre-fill credentials in the form — user must click Sign In themselves
    setEmail(demoEmail);
    setPassword('roadguard2026');
    setError(null);
    setSelectedPreset(null); // close modal, returning to main form
  };


  const handleRegisterRedirect = (preset: DemoPreset) => {
    setSelectedPreset(null);
    // Navigate to register with role hint in query params
    navigate(`/register?role=${encodeURIComponent(preset.role)}&hint=${encodeURIComponent(preset.label)}`);
  };

  const demoPresets: DemoPreset[] = [
    { label: 'Citizen', desc: 'Ravi Kumar', email: 'citizen@roadguard.org', badge: 'bg-emerald-500/10 text-emerald-400', role: 'citizen' },
    { label: 'Field Inspector', desc: 'P. Suresh', email: 'inspector@roadguard.org', badge: 'bg-sky-500/10 text-sky-400', role: 'field_inspector' },
    { label: 'Municipal Officer', desc: 'K. Lakshmi', email: 'municipal@roadguard.org', badge: 'bg-amber-500/10 text-amber-400', role: 'municipal_authority' },
    { label: 'State Highway PWD', desc: 'M. Ramesh', email: 'pwd@roadguard.org', badge: 'bg-indigo-500/10 text-indigo-400', role: 'state_highway_authority' },
    { label: 'NHAI Director', desc: 'Dr. Ananya', email: 'nhai@roadguard.org', badge: 'bg-purple-500/10 text-purple-400', role: 'nhai_authority' },
    { label: 'Maintenance Contractor', desc: 'V. Prasad', email: 'contractor@roadguard.org', badge: 'bg-orange-500/10 text-orange-400', role: 'maintenance_contractor' },
    { label: 'System Admin', desc: 'Central Admin', email: 'admin@roadguard.org', badge: 'bg-red-500/10 text-red-400', role: 'admin' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950">
      <div className="max-w-md w-full space-y-8 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">

        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-3">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Sign In to RoadGuard</h2>
          <p className="mt-1 text-xs text-slate-400">
            Access citizen reporting, GIS routing, and municipal authority work orders
          </p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. municipal@roadguard.org"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 focus:outline-none transition disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        {/* 1-Click Authority Demo Cards */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase text-sky-400 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> 1-Click Demo Accounts (Viva Defense)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">pwd: roadguard2026</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {demoPresets.map((p) => (
              <button
                key={p.email}
                type="button"
                onClick={() => setSelectedPreset(p)}
                disabled={loading}
                className="text-left p-2 bg-slate-950 border border-slate-800 hover:border-sky-500/50 rounded-lg transition group relative"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-300">{p.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${p.badge}`}>{p.desc.split(' ')[0]}</span>
                </div>
                <p className="text-[10px] text-slate-500 truncate">{p.email}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-sky-400 hover:text-sky-300 font-semibold">
            Register as Citizen
          </Link>
        </div>

      </div>

      {/* Authority Action Popup Modal */}
      {selectedPreset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedPreset(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 w-80 mx-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedPreset(null)}
              className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="mb-5">
              <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-mono mb-2 ${selectedPreset.badge}`}>
                {selectedPreset.label}
              </span>
              <h3 className="text-base font-bold text-white">{selectedPreset.desc}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedPreset.email}</p>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Choose an action for the <span className="text-white font-semibold">{selectedPreset.label}</span> authority account:
            </p>

            {/* Login Button */}
            <button
              onClick={() => handleQuickLogin(selectedPreset.email)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition mb-3 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Signing in...' : 'Login as ' + selectedPreset.label}
            </button>

            {/* Register Button */}
            <button
              onClick={() => handleRegisterRedirect(selectedPreset)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-700 hover:border-sky-500/60 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white text-sm font-semibold transition"
            >
              <UserPlus className="w-4 h-4" />
              Register as {selectedPreset.label}
            </button>

            <p className="text-[10px] text-slate-500 text-center mt-3">
              Demo password: <span className="font-mono text-slate-400">roadguard2026</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
