// src/pages/ResetPassword.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { updateUserPassword } from '../services/supabase';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateUserPassword(password.trim());
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 flex flex-col justify-center items-center px-3 safe-area">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden border border-blue-100">
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-base">GKBC</span>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <h1 className="text-2xl font-black text-gray-900 text-center">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  GKBC
                </span>
              </h1>
              <p className="text-xs text-gray-500 text-center font-medium mt-0.5">
                Global Knowledge Business Community
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Password Updated!</h2>
            <p className="text-gray-600 text-sm mb-4">
              Your password has been successfully reset. Redirecting to login...
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all min-h-[44px]"
            >
              Go to Login Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 flex flex-col justify-center items-center px-3 safe-area">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden border border-blue-100">
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-base">GKBC</span>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <h1 className="text-2xl font-black text-gray-900 text-center">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                GKBC
              </span>
            </h1>
            <p className="text-xs text-gray-500 text-center font-medium mt-0.5">
              Global Knowledge Business Community
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-200">
                <Lock className="text-blue-600" size={22} />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1.5">Set New Password</h2>
              <p className="text-gray-500 text-xs">
                Enter your new password below
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-red-600 flex-shrink-0" size={16} />
                  <p className="text-red-800 font-medium text-xs">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Lock className="text-gray-400" size={16} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Enter new password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Lock className="text-gray-400" size={16} />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px]"
              >
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;