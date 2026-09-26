import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { loginWithDemo, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('oliver.brown@domain.io');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate('/dashboard/scheduled');
  }

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth route
    window.location.href = '/api/auth/google';
  };

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await loginWithDemo(email, 'Oliver Brown');
    setLoading(false);
    navigate('/dashboard/scheduled');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-4 py-12">
      <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-3xl p-8 shadow-sm">
        {/* Title matching screenshot 2 */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-8 tracking-tight">Login</h1>

        {/* Google Login Button matching screenshot 2 */}
        <button
          onClick={handleGoogleLogin}
          className="w-full py-3 px-4 bg-[#E6F4EA] hover:bg-[#D8EFE0] text-gray-800 rounded-2xl flex items-center justify-center space-x-3 text-sm font-semibold transition-colors mb-6 shadow-2xs"
        >
          {/* SVG Google G logo */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Login with Google</span>
        </button>

        {/* Divider matching screenshot 2 */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="border-t border-gray-200 w-full"></div>
          <span className="bg-white px-3 text-xs text-gray-400 font-medium whitespace-nowrap">
            or sign up through email
          </span>
        </div>

        {/* Email/Password form matching screenshot 2 */}
        <form onSubmit={handleFormLogin} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email ID"
              required
              className="w-full bg-[#F3F4F6] border border-transparent focus:border-green-500 text-sm rounded-2xl py-3.5 px-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white transition-all"
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full bg-[#F3F4F6] border border-transparent focus:border-green-500 text-sm rounded-2xl py-3.5 px-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#00A859] hover:bg-[#008f4c] text-white font-semibold text-sm rounded-2xl shadow-sm transition-colors mt-2"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Fast 1-Click Demo Login */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <button
            type="button"
            onClick={() => handleFormLogin({ preventDefault: () => {} } as any)}
            className="text-xs font-semibold text-[#00A859] hover:underline"
          >
            ⚡ 1-Click Demo Login as Oliver Brown
          </button>
        </div>
      </div>
    </div>
  );
};
