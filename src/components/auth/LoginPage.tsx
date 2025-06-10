import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // Adjust path as needed

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, loading } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email || !password) {
      setLocalError("Email and password are required.");
      return;
    }
    try {
      await login(email, password);
      // Navigation to app content will be handled by App.tsx or a router
    } catch (err: any) {
      // error from useAuth will also be set, but we can display it here if preferred
      console.error("Login failed:", err);
      setLocalError(err.message || "Failed to log in. Please check your credentials.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1a1a2e] p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-[#2a2a3e] shadow-2xl border-4 border-[#0f0f1a]">
        <h2 className="text-2xl font-bold text-center text-[#f0a500]">Login to PixelArtForge</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 mt-1 bg-[#1a1a2e] border-2 border-[#0f0f1a] text-gray-200 focus:border-[#f0a500] focus:ring-0 outline-none text-sm placeholder-gray-500"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mt-1 bg-[#1a1a2e] border-2 border-[#0f0f1a] text-gray-200 focus:border-[#f0a500] focus:ring-0 outline-none text-sm placeholder-gray-500"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          {localError && <p className="text-xs text-red-500 text-center">{localError}</p>}
          {error && !localError && <p className="text-xs text-red-500 text-center">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-base font-bold text-[#1a1a2e] bg-[#f0a500] hover:bg-yellow-400 transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-t-transparent border-[#1a1a2e] rounded-full animate-spin"></div>
              ) : (
                'Login'
              )}
            </button>
          </div>
        </form>
        <p className="text-sm text-center text-gray-400">
          Don't have an account?{' '}
          {/* Link to SignupPage will be handled by routing or state in App.tsx */}
          {/* For now, just a placeholder or a simple state switch if App.tsx manages this */}
          <button onClick={() => alert("Navigate to Signup Page (to be implemented in App.tsx or with a router)")} className="font-medium text-[#f0a500] hover:underline">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
