import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Shield, UserPlus, AlertCircle, Info } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Role hint passed from the login page authority modal
  const roleHint = searchParams.get('role') || 'citizen';
  const labelHint = searchParams.get('hint') || 'Citizen';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Civilian Resident - Ward 5');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Map role to badge color
  const roleBadgeMap: Record<string, string> = {
    citizen: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    field_inspector: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    municipal_authority: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    state_highway_authority: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    nhai_authority: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    maintenance_contractor: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    admin: 'bg-red-500/10 text-red-400 border-red-500/30',
  };
  const badgeClass = roleBadgeMap[roleHint] || roleBadgeMap['citizen'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.register({
        email,
        password,
        full_name: fullName,
        phone,
        department,
        role: roleHint
      });
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950">
      <div className="max-w-md w-full space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
        
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-3">
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Create Account</h2>
          <p className="mt-1 text-xs text-slate-400">
            Join RoadGuard to report, inspect, and manage municipal road infrastructure
          </p>
        </div>

        {/* Role banner from authority card selection */}
        {roleHint && roleHint !== 'citizen' && (
          <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium ${badgeClass}`}>
            <Info className="w-3.5 h-3.5 shrink-0" />
            Registering as: <span className="font-bold">{labelHint}</span>
            <span className="ml-auto text-[10px] opacity-70 font-mono">{roleHint}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ramesh Varma"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. citizen@example.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98480 00000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Resident Area / Ward
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Ward 12, Pedatadepalli"
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
              minLength={6}
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
            <span>{loading ? 'Registering...' : 'Complete Registration'}</span>
          </button>
        </form>

        <div className="text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="text-sky-400 hover:text-sky-300 font-semibold">
            Sign In here
          </Link>
        </div>

      </div>
    </div>
  );
};
