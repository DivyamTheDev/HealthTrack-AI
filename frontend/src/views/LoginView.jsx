import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldCheck, Heart, User, Key, Lock, ArrowRight, RefreshCw } from 'lucide-react';

const LoginView = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Invalid username or password');
      setLoading(false);
    }
  };

  const handleQuickLogin = async (user, pass) => {
    setError('');
    setLoading(true);
    setUsername(user);
    setPassword(pass);
    try {
      await login(user, pass);
    } catch (err) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      
      {/* Visual background ambient details */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-zinc-900 rounded-full blur-[120px] opacity-30 pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl mb-4 group hover:border-zinc-700 transition-all duration-300">
          <Heart className="h-8 w-8 text-rose-500 fill-rose-500/10 group-hover:scale-110 transition-transform duration-300" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans sm:text-4xl">
          HealthTrack <span className="text-zinc-400 font-light">AI</span>
        </h2>
        <p className="mt-2 text-sm text-zinc-400 font-sans max-w-sm mx-auto">
          Preventive-health intelligence platform. Enter credentials or select a demo profile below.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-zinc-900/50 backdrop-blur-md py-8 px-4 border border-zinc-800 shadow-2xl rounded-3xl sm:px-10 card-glow">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Username
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  disabled={loading}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-700 disabled:opacity-50 transition-all font-sans text-sm"
                  placeholder="e.g. divyam"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Password
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-700 disabled:opacity-50 transition-all font-sans text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-zinc-700 rounded-xl shadow-sm text-sm font-semibold text-white bg-zinc-800 hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick login divider */}
          <div className="mt-8">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <span className="relative px-3 bg-zinc-900 text-xs text-zinc-500 uppercase tracking-wider font-semibold font-sans">
                Quick Select Profiles
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('dr_smith', 'password123')}
                className="flex flex-col items-center justify-center p-3 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 rounded-2xl transition-all disabled:opacity-50 group"
              >
                <span className="text-zinc-200 text-sm font-semibold group-hover:text-white transition-colors">Clinician</span>
                <span className="text-zinc-500 text-[10px] font-mono mt-0.5">dr_smith</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('divyam', 'password123')}
                className="flex flex-col items-center justify-center p-3 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 rounded-2xl transition-all disabled:opacity-50 group"
              >
                <span className="text-zinc-200 text-sm font-semibold group-hover:text-white transition-colors">Patient</span>
                <span className="text-zinc-500 text-[10px] font-mono mt-0.5">divyam</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
