import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Phone, 
  User, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Building,
  Smartphone,
  Check,
  X,
  Clock,
  UserCheck
} from 'lucide-react';
import { supabase } from '../services/supabase';

// Interface for form data
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

// Status Modal Component
const StatusModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  email: string;
  type: 'already_registered' | 'new_user_success';
  redirectSeconds: number;
}> = ({ isOpen, onClose, email, type, redirectSeconds }) => {
  if (!isOpen) return null;

  const isAlreadyRegistered = type === 'already_registered';
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-center mb-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${
              isAlreadyRegistered 
                ? 'bg-blue-100 border-blue-200' 
                : 'bg-green-100 border-green-200'
            }`}>
              {isAlreadyRegistered ? (
                <UserCheck className="text-blue-600" size={24} />
              ) : (
                <CheckCircle className="text-green-600" size={24} />
              )}
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 text-center">
            {isAlreadyRegistered ? 'Account Already Registered' : 'Check Your Email!'}
          </h3>
        </div>

        {/* Modal Body */}
        <div className="p-4">
          <div className="text-center mb-4">
            {isAlreadyRegistered ? (
              <>
                <p className="text-gray-600 mb-2 text-sm">
                  An account with email <span className="font-semibold text-blue-600">{email}</span> already exists.
                </p>
                <p className="text-gray-600 text-sm">
                  Redirecting you to login...
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-2 text-sm">
                  A verification link has been sent to:
                </p>
                <p className="font-semibold text-blue-600 text-base mb-3">{email}</p>
                <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-700 mb-1">
                    <span className="font-semibold">📧 Check your inbox or spam folder</span> for an email titled <span className="font-mono bg-blue-100 px-1 py-0.5 rounded">"Supabase Authentication"</span>
                  </p>
                  <p className="text-xs text-gray-700 mb-1">
                    <span className="font-semibold">🔗 Click the link</span> to verify your email. You'll be redirected to login.
                  </p>
                  <p className="text-xs text-gray-700 mb-1">
                    <span className="font-semibold">⏱️ Link expires in 10 minutes.</span> Sometimes emails take a little longer to arrive.
                  </p>
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold">⚠️ Be patient</span> before trying to sign up again.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700">
                {isAlreadyRegistered ? 'Redirecting to login...' : 'Redirecting in...'}
              </span>
              <span className="text-xs font-medium text-blue-600">{redirectSeconds}s</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${
                  isAlreadyRegistered ? 'bg-blue-500' : 'bg-green-500'
                }`}
                style={{ 
                  width: `${100 - (redirectSeconds / (isAlreadyRegistered ? 3 : 10) * 100)}%` 
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main SignUp Component
const SignUp: React.FC = () => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  // Modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [modalType, setModalType] = useState<'already_registered' | 'new_user_success'>('new_user_success');
  const [redirectSeconds, setRedirectSeconds] = useState(10);
  const [modalEmail, setModalEmail] = useState('');

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    if (field === 'firstName' || field === 'lastName') {
      const stringValue = value as string;
      if (/^[a-zA-Z\s\-]*$/.test(stringValue) || stringValue === '') {
        setFormData(prev => ({ ...prev, [field]: stringValue }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    if (serverError) {
      setServerError(null);
    }

    if (field === 'password') {
      const password = value as string;
      let strength = 0;
      if (password.length >= 6) strength += 33;
      if (/[A-Z]/.test(password)) strength += 33;
      if (/[0-9]/.test(password)) strength += 34;
      setPasswordStrength(strength);
    }
  };

  // Validate Nigerian phone number
  const validateNigerianPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    if (!cleaned.startsWith('+234')) {
      return false;
    }
    
    if (cleaned.length !== 14) {
      return false;
    }
    
    const remainingDigits = cleaned.substring(4);
    if (!/^[0-9]{10}$/.test(remainingDigits)) {
      return false;
    }
    
    if (remainingDigits.charAt(0) === '0') {
      return false;
    }
    
    return true;
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s\-]+$/.test(formData.firstName)) {
      errors.firstName = 'First name can only contain letters, spaces, and hyphens';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s\-]+$/.test(formData.lastName)) {
      errors.lastName = 'Last name can only contain letters, spaces, and hyphens';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (formData.phone) {
      if (!validateNigerianPhone(formData.phone)) {
        errors.phone = 'Phone must start with +234 and be 14 digits total (e.g., +2348000000000)';
      }
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*[0-9])/.test(formData.password)) {
      errors.password = 'Password must contain at least one number';
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.agreeToTerms) {
      errors.agreeToTerms = 'You must agree to the terms and conditions';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if user exists
  const checkUserExists = async (email: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      
      return !!data;
    } catch (error) {
      // Only log critical network errors
      if (error instanceof Error && error.message.includes('network')) {
        console.error('Network error checking user existence');
      }
      return false;
    }
  };

  // Create new user
  const createNewUser = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password.trim(),
        options: {
          data: {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            phone: formData.phone.trim() || null,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      
      if (error) throw error;
      return true;
      
    } catch (error: any) {
      // Log critical errors only
      if (error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
        console.error('Critical network error creating user');
      }
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setServerError(null);
    
    try {
      const email = formData.email.trim();
      
      // Check if user already exists
      const userExists = await checkUserExists(email);
      
      if (userExists) {
        // Show "already registered" modal
        setModalEmail(email);
        setModalType('already_registered');
        setRedirectSeconds(3);
        setShowStatusModal(true);
        
        // Start countdown for redirect
        const countdown = setInterval(() => {
          setRedirectSeconds(prev => {
            if (prev <= 1) {
              clearInterval(countdown);
              navigate('/login', { 
                state: { prefilledEmail: email } 
              });
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // Create new user
        const created = await createNewUser();
        
        if (created) {
          // Show success modal
          setModalEmail(email);
          setModalType('new_user_success');
          setRedirectSeconds(10);
          setShowStatusModal(true);
          
          // Start 10-second countdown
          const countdown = setInterval(() => {
            setRedirectSeconds(prev => {
              if (prev <= 1) {
                clearInterval(countdown);
                navigate('/login', { 
                  state: { 
                    message: 'Please check your email to verify your account',
                    email: email 
                  } 
                });
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
      
    } catch (error: any) {
      let userMessage = error.message || 'Registration failed. Please try again.';
      
      if (error.message?.includes('already registered') || error.message?.includes('User already registered')) {
        userMessage = 'This email is already registered. Please try logging in.';
      } else if (error.message?.includes('rate limit')) {
        userMessage = 'Too many attempts. Please wait a few minutes before trying again.';
      } else if (error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
        userMessage = 'Network error. Please check your connection and try again.';
      }
      
      setServerError(userMessage);
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Status Modal */}
      <StatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        email={modalEmail}
        type={modalType}
        redirectSeconds={redirectSeconds}
      />
      
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 flex flex-col justify-center items-center px-3 py-6 safe-area">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-blue-600/10 to-transparent" />
        <div className="absolute top-1/4 -right-12 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-12 w-48 h-48 bg-indigo-400/5 rounded-full blur-3xl" />
        
        {/* Main Container */}
        <div className="w-full max-w-md relative z-10">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            {/* Logo Container */}
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden border border-blue-100">
                <img 
                  src="/gkbclogo.png" 
                  alt="GKBC Logo" 
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `
                      <div class="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                        <span class="text-white font-bold text-base">GKBC</span>
                      </div>
                    `;
                  }}
                />
              </div>
            </div>
            
            {/* GKBC Title */}
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
            
            {/* Form Header */}
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Create Your Account</h2>
              <p className="text-xs text-gray-500 font-medium max-w-xs mx-auto">
                Join Greater Kano and grow your business
              </p>
            </div>
          </div>

          {/* Signup Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/80 overflow-hidden mb-4">
            <div className="p-4">
              {/* Server Error Display */}
              {serverError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-red-800 font-medium text-xs">{serverError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Signup Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* First Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-700 pl-1">
                      First Name *
                    </label>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center">
                        <User className="text-gray-400" size={16} />
                      </div>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-1 focus:border-blue-500 ${
                          validationErrors.firstName
                            ? 'border-red-300 focus:ring-red-500/20'
                            : 'border-blue-200 focus:ring-blue-500/20'
                        }`}
                        placeholder="Abdullahi"
                        required
                      />
                    </div>
                    {validationErrors.firstName && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <X size={10} />
                        {validationErrors.firstName}
                      </p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-700 pl-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className={`w-full px-3 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-1 focus:border-blue-500 ${
                        validationErrors.lastName
                          ? 'border-red-300 focus:ring-red-500/20'
                          : 'border-blue-200 focus:ring-blue-500/20'
                      }`}
                      placeholder="Ahmad"
                      required
                    />
                    {validationErrors.lastName && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <X size={10} />
                        {validationErrors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-gray-700 pl-1">
                    Email *
                  </label>
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center">
                      <Mail className="text-gray-400" size={16} />
                    </div>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-1 focus:border-blue-500 ${
                        validationErrors.email
                          ? 'border-red-300 focus:ring-red-500/20'
                          : 'border-blue-200 focus:ring-blue-500/20'
                      }`}
                      placeholder="Ahmad@company.com"
                      required
                    />
                  </div>
                  {validationErrors.email && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <X size={10} />
                      {validationErrors.email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-gray-700 pl-1">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center">
                      <Phone className="text-gray-400" size={16} />
                    </div>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-1 focus:border-blue-500 ${
                        validationErrors.phone
                          ? 'border-red-300 focus:ring-red-500/20'
                          : 'border-blue-200 focus:ring-blue-500/20'
                      }`}
                      placeholder="+2348000000000"
                    />
                  </div>
                  {validationErrors.phone && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <X size={10} />
                      {validationErrors.phone}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    Format: +234 followed by 10 digits (e.g., +2348000000000)
                  </p>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pl-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center">
                      <Lock className="text-gray-400" size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-1 focus:border-blue-500 ${
                        validationErrors.password
                          ? 'border-red-300 focus:ring-red-500/20'
                          : 'border-blue-200 focus:ring-blue-500/20'
                      }`}
                      placeholder="Create a strong password"
                      required
                    />
                    <div className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength */}
                  {formData.password && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Password strength:</span>
                        <span className={`font-medium ${
                          passwordStrength < 50 ? 'text-red-600' :
                          passwordStrength < 80 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {passwordStrength < 50 ? 'Weak' :
                           passwordStrength < 80 ? 'Good' : 'Strong'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${
                            passwordStrength < 50 ? 'bg-red-500' :
                            passwordStrength < 80 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${passwordStrength}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {validationErrors.password && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <X size={10} />
                      {validationErrors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-gray-700 pl-1">
                    Confirm Password *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`w-full px-3 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-1 focus:border-blue-500 ${
                      validationErrors.confirmPassword
                        ? 'border-red-300 focus:ring-red-500/20'
                        : 'border-blue-200 focus:ring-blue-500/20'
                    }`}
                    placeholder="Re-enter your password"
                    required
                  />
                  {validationErrors.confirmPassword && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <X size={10} />
                      {validationErrors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Terms Agreement */}
                <div className="pt-1">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <div className="relative mt-0.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={formData.agreeToTerms}
                        onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                        className={`h-4 w-4 rounded border ${
                          validationErrors.agreeToTerms
                            ? 'border-red-300 text-red-600'
                            : 'border-blue-300 text-blue-600'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-700">
                        I agree to the{' '}
                        <Link to="/terms" className="text-blue-600 font-semibold hover:underline">
                          Terms & Conditions
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" className="text-blue-600 font-semibold hover:underline">
                          Privacy Policy
                        </Link>
                      </span>
                      {validationErrors.agreeToTerms && (
                        <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                          <X size={10} />
                          {validationErrors.agreeToTerms}
                      </p>
                      )}
                    </div>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3 rounded-lg shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">Processing...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">Create Account</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="px-3 text-xs text-gray-500 font-medium">Already have an account?</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              {/* Login Link */}
              <button
                onClick={() => navigate('/login')}
                className="w-full border border-gray-300 text-gray-700 font-bold py-2.5 rounded-lg hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 min-h-[44px]"
              >
                Sign In Instead
              </button>
            </div>
          </div>

          {/* Security Footer */}
          <div className="bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-sm rounded-lg border border-gray-200/60 p-3">
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-md flex items-center justify-center mb-0.5">
                  <Shield size={12} className="text-white" />
                </div>
                <span className="text-xs text-gray-600 font-medium">Secure</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center mb-0.5">
                  <Building size={12} className="text-white" />
                </div>
                <span className="text-xs text-gray-600 font-medium">Verified</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-md flex items-center justify-center mb-0.5">
                  <Smartphone size={12} className="text-white" />
                </div>
                <span className="text-xs text-gray-600 font-medium">GKBC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignUp;