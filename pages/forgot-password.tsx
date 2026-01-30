import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabase';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fixed: Use direct event handler with proper state update
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError && resetError.message.includes('429')) {
        throw new Error('Too many attempts. Please try again in a few minutes.');
      }

      setShowSuccess(true);
      
    } catch (err: any) {
      if (err.message.includes('Too many attempts')) {
        setError(err.message);
      } else {
        // For security, show success even if error
        setShowSuccess(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

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
              Africa's Emerging Economic Vanguard
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-4">
          <div className="p-4">
            {showSuccess ? (
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-green-200">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-1.5">Reset Link Sent</h2>
                <p className="text-gray-500 text-xs mb-3">
                  We've sent a password reset link to <span className="font-semibold text-blue-600">{email}</span>.
                  Please check your email inbox.
                </p>
                <button
                  onClick={handleBackToLogin}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all min-h-[44px]"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-200">
                    <Mail className="text-blue-600" size={22} />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1.5">Reset Your Password</h2>
                  <p className="text-gray-500 text-xs">
                    Enter your email address and we'll send you a link to reset your password
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0">
                        <AlertCircle className="text-red-600" size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-red-800 font-medium text-xs">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="space-y-1.5 mb-4">
                    <label className="block text-xs font-medium text-gray-700">
                      Email Address *
                    </label>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center">
                        <Mail className="text-gray-400" size={16} />
                      </div>
                      <input
                        ref={emailRef}
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder="your@email.com"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm">Sending Reset Link...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm">Send Reset Link</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>

                <div className="flex items-center my-4">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <span className="px-3 text-xs text-gray-500 font-medium">Remember your password?</span>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>

                <button
                  onClick={handleBackToLogin}
                  className="w-full border border-gray-300 text-gray-700 font-bold py-2.5 rounded-lg hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <ArrowLeft size={16} />
                  Back to Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;