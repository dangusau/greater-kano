import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { X, Upload, Store, MapPin, Mail, Phone, Globe, CheckCircle, AlertCircle, Building, ChevronRight, ChevronLeft, User, Briefcase, Navigation } from 'lucide-react';
import { LOCATION_AXIS } from '../../types/business';
import { useAuth } from '../../contexts/AuthContext';
import { businessService } from '../../services/supabase/business';
import { appCache } from '../../shared/services/UniversalCache';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (businessData: any) => Promise<string>;
}

const CACHE_KEYS = {
  CATEGORIES: 'gkbc_business_categories',
  LOCATIONS: 'gkbc_location_counts'
};

const CreateBusinessModal: React.FC<CreateBusinessModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit 
}) => {
  const { userProfile } = useAuth();
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    business_type: 'products' as 'products' | 'services',
    category: '',
    location_axis: '',
    address: '',
    email: '',
    phone: '',
    website: '',
    is_registered: false
  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [categories, setCategories] = useState<{ category: string; business_type: string; count: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isVerified = useMemo(() => userProfile?.user_status === 'verified', [userProfile]);

  const loadCategories = useCallback(async () => {
    try {
      const cached = await appCache.get<typeof categories>(CACHE_KEYS.CATEGORIES);
      if (cached) {
        setCategories(cached);
        return;
      }
      
      const data = await businessService.getCategories();
      setCategories(data);
      await appCache.set(CACHE_KEYS.CATEGORIES, data, 10 * 60 * 1000);
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen, loadCategories]);

  const validateForm = useCallback((): boolean => {
    if (!formData.name.trim()) {
      setError('Business name is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    if (!formData.category.trim()) {
      setError('Category is required');
      return false;
    }
    if (!formData.location_axis.trim()) {
      setError('Location is required');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    
    const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      setError('Please enter a valid Nigerian phone number (e.g., 08012345678 or +2348012345678)');
      return false;
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    return true;
  }, [formData]);

  const formatWebsiteUrl = useCallback((url: string): string => {
    if (!url.trim()) return '';
    
    let formattedUrl = url.trim().toLowerCase();
    
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }
    
    return formattedUrl;
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isVerified) {
      setError('Only verified members can create businesses. Please contact support.');
      return;
    }
    
    if (!validateForm()) return;
    
    setUploading(true);
    setError('');
    setSuccess('');
    
    try {
      const businessData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        business_type: formData.business_type,
        category: formData.category.trim(),
        location_axis: formData.location_axis,
        address: formData.address.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim(),
        website: formData.website.trim() ? formatWebsiteUrl(formData.website) : undefined,
        logo_file: logoFile || undefined,
        banner_file: bannerFile || undefined,
        is_registered: formData.is_registered
      };

      await onSubmit(businessData);
      
      setSuccess('Business submitted successfully! It will be reviewed before listing.');
      
      setTimeout(() => {
        resetForm();
        onClose();
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Failed to create business. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [formData, logoFile, bannerFile, isVerified, validateForm, formatWebsiteUrl, onSubmit, onClose]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      business_type: 'products',
      category: '',
      location_axis: '',
      address: '',
      email: '',
      phone: '',
      website: '',
      is_registered: false
    });
    setLogoFile(null);
    setBannerFile(null);
    setLogoPreview('');
    setBannerPreview('');
    setStep(1);
    setError('');
    setSuccess('');
  }, []);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo file size should be less than 5MB');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file for logo');
      return;
    }
    
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setError('');
  }, []);

  const handleBannerUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    
    if (file.size > 10 * 1024 * 1024) {
      setError('Banner file size should be less than 10MB');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file for banner');
      return;
    }
    
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setError('');
  }, []);

  const removeLogoFile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLogoFile(null);
    setLogoPreview('');
    if (logoPreview) URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);

  const removeBannerFile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setBannerFile(null);
    setBannerPreview('');
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
  }, [bannerPreview]);

  const updateFormData = useCallback((field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const goToNextStep = useCallback(() => {
    if (step === 1 && (!formData.name.trim() || !formData.description.trim() || !formData.category.trim())) {
      setError('Please fill in all required fields');
      return;
    }
    if (step === 2 && !formData.location_axis.trim()) {
      setError('Please select a location');
      return;
    }
    setError('');
    setStep(step + 1);
  }, [step, formData]);

  const goToPrevStep = useCallback(() => {
    setError('');
    setStep(step - 1);
  }, [step]);

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => cat.business_type === formData.business_type);
  }, [categories, formData.business_type]);

  const isStepValid = useCallback((): boolean => {
    switch (step) {
      case 1:
        return !uploading && !!formData.name.trim() && !!formData.description.trim() && !!formData.category.trim();
      case 2:
        return !uploading && !!formData.location_axis.trim();
      case 3:
        return !uploading && !!formData.phone.trim();
      default:
        return false;
    }
  }, [step, uploading, formData]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [logoPreview, bannerPreview]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-3 bg-black/50 backdrop-blur-sm safe-area">
      <div className="bg-white w-full md:max-w-2xl max-h-[90vh] md:max-h-[80vh] overflow-y-auto rounded-t-xl md:rounded-xl shadow-lg border border-blue-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-blue-200 p-3 z-10 safe-area-top">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <Building size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Create Business</h2>
                <p className="text-xs text-gray-600">Join GKBC business network</p>
              </div>
              
              {step === 3 && (
                <button
                  type="submit"
                  form="business-form"
                  disabled={!isStepValid() || uploading}
                  className="ml-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px] text-xs flex items-center justify-center gap-1"
                >
                  {uploading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={12} />
                      <span>Submit</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            <button 
              onClick={() => {
                if (!uploading) {
                  resetForm();
                  onClose();
                }
              }} 
              className="p-1.5 hover:bg-blue-50 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px] min-w-[36px] flex items-center justify-center"
              disabled={uploading}
              aria-label="Close modal"
            >
              <X size={16} className="text-gray-600 hover:text-gray-900" />
            </button>
          </div>
        </div>

        {/* Step Progress */}
        <div className="px-3 pt-3">
          <div className="flex items-center justify-between mb-3">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex flex-col items-center flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  step === stepNumber
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : step > stepNumber
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {step > stepNumber ? <CheckCircle size={12} /> : stepNumber}
                </div>
                <span className={`text-xs font-medium mt-1 transition-colors duration-300 ${
                  step === stepNumber
                    ? 'text-blue-600'
                    : step > stepNumber
                    ? 'text-green-600'
                    : 'text-gray-500'
                }`}>
                  {stepNumber === 1 ? 'Basic Info' : stepNumber === 2 ? 'Details' : 'Contact'}
                </span>
              </div>
            ))}
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-gray-100 px-3">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-blue-700 transition-all duration-500"
                style={{ width: `${((step - 1) / 2) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {(error || success) && (
          <div className="mx-3 mt-3">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 text-xs">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-start gap-2">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-700 text-xs">{success}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form Content */}
        {!success ? (
          <form id="business-form" onSubmit={handleSubmit} className="p-3 space-y-4 pb-24">
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Business Name *
                  </label>
                  <div className="relative">
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                      <Store size={14} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      placeholder="Enter your business name"
                      className="w-full pl-8 pr-3 py-2.5 bg-white border border-blue-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all disabled:opacity-50"
                      required
                      disabled={uploading}
                      maxLength={100}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.name.length}/100 characters
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Describe what your business does..."
                    className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all disabled:opacity-50 h-32"
                    maxLength={500}
                    required
                    disabled={uploading}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">
                      Brief description helps customers understand your business
                    </p>
                    <span className="text-xs font-medium text-blue-600">
                      {formData.description.length}/500
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Business Type *
                    </label>
                    <div className="flex border border-blue-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateFormData('business_type', 'products')}
                        className={`flex-1 py-2.5 text-center font-medium text-xs transition-colors min-h-[36px] ${
                          formData.business_type === 'products' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white text-gray-700 hover:bg-blue-50'
                        }`}
                      >
                        Products
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFormData('business_type', 'services')}
                        className={`flex-1 py-2.5 text-center font-medium text-xs transition-colors min-h-[36px] ${
                          formData.business_type === 'services' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white text-gray-700 hover:bg-blue-50'
                        }`}
                      >
                        Services
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => updateFormData('category', e.target.value)}
                      className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all disabled:opacity-50 min-h-[36px]"
                      required
                      disabled={uploading}
                    >
                      <option value="">Select category</option>
                      {filteredCategories.map(cat => (
                        <option key={cat.category} value={cat.category}>
                          {cat.category} ({cat.count})
                        </option>
                      ))}
                      <option value="other">Other</option>
                    </select>
                    {formData.category === 'other' && (
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => updateFormData('category', e.target.value)}
                        placeholder="Enter custom category"
                        className="w-full p-2.5 mt-2 bg-white border border-blue-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                        maxLength={50}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Business Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Location Axis *
                  </label>
                  <div className="relative">
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                      <Navigation size={14} className="text-gray-400" />
                    </div>
                    <select
                      value={formData.location_axis}
                      onChange={(e) => updateFormData('location_axis', e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 bg-white border border-blue-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all disabled:opacity-50 min-h-[36px]"
                      required
                      disabled={uploading}
                    >
                      <option value="">Select your business area</option>
                      {LOCATION_AXIS.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Full Address
                  </label>
                  <div className="relative">
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                      <MapPin size={14} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => updateFormData('address', e.target.value)}
                      placeholder="Street, building, landmark details"
                      className="w-full pl-8 pr-3 py-2.5 bg-white border border-blue-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all disabled:opacity-50"
                      disabled={uploading}
                      maxLength={200}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Logo Upload */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Logo (Optional)
                    </label>
                    <label className={`block relative aspect-square border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                      uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-300'
                    } ${logoFile ? 'border-blue-400' : 'border-blue-200'}`}>
                      {logoPreview ? (
                        <>
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-full h-full object-cover"
                          />
                          {!uploading && (
                            <button
                              type="button"
                              onClick={removeLogoFile}
                              className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black/90 transition-colors duration-200 min-h-[24px] min-w-[24px]"
                              aria-label="Remove logo"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3">
                          <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mb-1 border border-blue-200">
                            <Upload size={14} className="text-blue-500" />
                          </div>
                          <span className="text-xs text-gray-600 font-medium">Upload Logo</span>
                          <span className="text-xs text-gray-500 mt-0.5 text-center">Square image, max 5MB</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={uploading}
                        aria-label="Upload business logo"
                      />
                    </label>
                  </div>

                  {/* Banner Upload */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Banner (Optional)
                    </label>
                    <label className={`block relative aspect-video border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                      uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-300'
                    } ${bannerFile ? 'border-blue-400' : 'border-blue-200'}`}>
                      {bannerPreview ? (
                        <>
                          <img
                            src={bannerPreview}
                            alt="Banner preview"
                            className="w-full h-full object-cover"
                          />
                          {!uploading && (
                            <button
                              type="button"
                              onClick={removeBannerFile}
                              className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black/90 transition-colors duration-200 min-h-[24px] min-w-[24px]"
                              aria-label="Remove banner"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3">
                          <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mb-1 border border-blue-200">
                            <Upload size={14} className="text-blue-500" />
                          </div>
                          <span className="text-xs text-gray-600 font-medium">Upload Banner</span>
                          <span className="text-xs text-gray-500 mt-0.5 text-center">Wide image, max 10MB</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        className="hidden"
                        disabled={uploading}
                        aria-label="Upload business banner"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Contact Information */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                        <Mail size={14} className="text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateFormData('email', e.target.value)}
                        placeholder="business@email.com"
                        className="w-full pl-8 pr-3 py-2.5 bg-white border border-blue-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all disabled:opacity-50"
                        disabled={uploading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                        <Phone size={14} className="text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateFormData('phone', e.target.value)}
                        placeholder="080XXXXXXXX or +2348012345678"
                        className="w-full pl-8 pr-3 py-2.5 bg-white border border-blue-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all disabled:opacity-50"
                        required
                        disabled={uploading}
                        inputMode="tel"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Nigerian format (080 or +234)
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Website (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                      <Globe size={14} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => updateFormData('website', e.target.value)}
                      placeholder="example.com or www.example.com"
                      className="w-full pl-8 pr-3 py-2.5 bg-white border border-blue-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all disabled:opacity-50"
                      disabled={uploading}
                      inputMode="url"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter domain without https:// (e.g., mybusiness.com)
                  </p>
                </div>

                <div className={`p-3 rounded-xl border transition-all duration-300 ${
                  formData.is_registered 
                    ? 'bg-blue-50 border-blue-300' 
                    : 'bg-white border-blue-200 hover:border-blue-300'
                } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => !uploading && updateFormData('is_registered', !formData.is_registered)}
                role="checkbox"
                aria-checked={formData.is_registered}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    !uploading && updateFormData('is_registered', !formData.is_registered);
                  }
                }}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      formData.is_registered 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-600' 
                        : 'bg-white border-blue-300'
                    }`}>
                      {formData.is_registered && <CheckCircle size={12} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-xs">Registered Business</h4>
                      <p className="text-gray-600 text-xs mt-0.5">
                        Check if your business is officially registered with CAC. 
                        Verified businesses get increased trust from customers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2 pt-4 border-t border-blue-100">
              {step > 1 && (
                <button
                  type="button"
                  onClick={goToPrevStep}
                  disabled={uploading}
                  className="flex-1 px-4 py-2.5 border border-blue-200 text-blue-600 font-medium rounded-xl hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs min-h-[36px]"
                >
                  <ChevronLeft size={14} />
                  Back
                </button>
              )}
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={!isStepValid()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs min-h-[36px]"
                >
                  Continue
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!isStepValid() || uploading || !isVerified}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-xs min-h-[36px]"
                >
                  {uploading ? 'Submitting...' : isVerified ? 'Submit Business' : 'Verified Members Only'}
                </button>
              )}
            </div>
          </form>
        ) : (
          /* Success State View */
          <div className="p-4">
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-3">
                <CheckCircle size={24} className="text-white" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 text-center">
                Business Submitted!
              </h3>
              <p className="text-gray-600 text-center text-xs max-w-md mb-4">
                Your business has been submitted for review. It will be listed on the platform after admin approval.
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all min-h-[36px] text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateBusinessModal;