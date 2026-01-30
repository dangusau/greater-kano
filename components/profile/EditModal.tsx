import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
  type: string;
  data: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: any) => Promise<void>;
}

const MARKET_AREAS = [
  'Central / Old City',
  'Sabon Gari / Kantin Kwari',
  'Farm Center / Beirut',
  'France Road',
  'Zoo Road',
  'Zaria Road',
  'Dawanau',
  'Sharada / Challawa',
  'Hotoro',
  'Gyadi-Gyadi / Tarauni',
  'Jigawa Road',
  'Mariri / Sheka',
  'Bompai',
  'Transport (Kano Line / Sabon Gari Park)',
  'Others'
];

const MARKETPLACE_CATEGORIES = [
  'Electronics',
  'Fashion',
  'Vehicles',
  'Property',
  'Services',
  'Others'
];

const EditModal: React.FC<Props> = ({ type, data, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (data) {
      if (type === 'profile') {
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          bio: data.bio || '',
          phone: data.phone || '',
          address: data.address || '',
          business_name: data.business_name || '',
          business_type: data.business_type || '',
          market_area: data.market_area || ''
        });
      } else if (type === 'listing') {
        setFormData({
          title: data.title || '',
          description: data.description || '',
          price: data.price || '',
          category: data.category || '',
          condition: data.condition || 'used',
          location: data.location || ''
        });
      } else if (type === 'business') {
        setFormData({
          name: data.name || '',
          description: data.description || '',
          business_type: data.business_type || '',
          category: data.category || '',
          location_axis: data.location_axis || '',
          address: data.address || '',
          email: data.email || '',
          phone: data.phone || '',
          website: data.website || ''
        });
      } else if (type === 'job') {
        setFormData({
          title: data.title || '',
          description: data.description || '',
          salary: data.salary || '',
          job_type: data.job_type || 'full-time',
          location: data.location || ''
        });
      } else if (type === 'event') {
        setFormData({
          title: data.title || '',
          description: data.description || '',
          event_date: data.event_date ? data.event_date.split('T')[0] + 'T' + data.event_date.split('T')[1].substring(0, 5) : '',
          location: data.location || ''
        });
      }
    }
  }, [data, type]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (type === 'profile') {
      if (!formData.first_name?.trim()) {
        newErrors.first_name = 'First name is required';
      }
      if (!formData.business_type) {
        newErrors.business_type = 'Business type is required';
      }
    } else if (type === 'listing') {
      if (!formData.title?.trim()) {
        newErrors.title = 'Title is required';
      }
      if (!formData.price || parseFloat(formData.price) <= 0) {
        newErrors.price = 'Valid price is required';
      }
      if (!formData.category) {
        newErrors.category = 'Category is required';
      }
    } else if (type === 'business') {
      if (!formData.name?.trim()) {
        newErrors.name = 'Business name is required';
      }
      if (!formData.business_type) {
        newErrors.business_type = 'Business type is required';
      }
      if (!formData.category?.trim()) {
        newErrors.category = 'Category is required';
      }
    } else if (type === 'job') {
      if (!formData.title?.trim()) {
        newErrors.title = 'Job title is required';
      }
    } else if (type === 'event') {
      if (!formData.title?.trim()) {
        newErrors.title = 'Event title is required';
      }
      if (!formData.event_date) {
        newErrors.event_date = 'Event date is required';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`[EditModal] Form submitted for type: ${type}`);
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccess(false);

    try {
      let transformedData = { ...formData };
      
      if (type === 'event') {
        if (transformedData.event_date) {
          transformedData.event_date = new Date(transformedData.event_date).toISOString();
        }
      }
      
      if (type === 'listing') {
        if (transformedData.price) {
          transformedData.price = parseFloat(transformedData.price);
        }
      }

      console.log(`[EditModal] Calling onSave with data:`, transformedData);
      await onSave(transformedData);
      console.log(`[EditModal] onSave completed successfully`);
      
      setSuccess(true);
      
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error: any) {
      console.error(`[EditModal] Save error:`, error);
      
      if (error.code === '23514') {
        setErrors({ 
          general: 'Invalid business type. Please select either "Products" or "Services".' 
        });
      } else if (error.message?.includes('network')) {
        setErrors({ 
          general: 'Network error. Please check your connection and try again.' 
        });
      } else {
        setErrors({ 
          general: error.message || 'Failed to save changes. Please try again.' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    if (errors.general) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.general;
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  const renderForm = () => {
    switch (type) {
      case 'profile':
        return (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium mb-2">First Name *</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name || ''}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg ${errors.first_name ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
              />
              {errors.first_name && (
                <div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle size={14} />
                  <span>{errors.first_name}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name || ''}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                name="bio"
                value={formData.bio || ''}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg h-32"
                maxLength={500}
                placeholder="Tell us about yourself..."
                disabled={loading}
              />
              <div className="text-right text-sm text-gray-500">
                {formData.bio?.length || 0}/500
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="+234 800 000 0000"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <input
                type="text"
                name="address"
                value={formData.address || ''}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="City, State"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Business Name</label>
              <input
                type="text"
                name="business_name"
                value={formData.business_name || ''}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Your business name"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Business Type *</label>
              <select
                name="business_type"
                value={formData.business_type || ''}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg ${errors.business_type ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
              >
                <option value="">Select type</option>
                <option value="products">Products</option>
                <option value="services">Services</option>
              </select>
              {errors.business_type && (
                <div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle size={14} />
                  <span>{errors.business_type}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Market Area</label>
              <select
                name="market_area"
                value={formData.market_area || ''}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                disabled={loading}
              >
                <option value="">Select market area</option>
                {MARKET_AREAS.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px] border border-blue-800"
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        );

      case 'listing':
        return (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title || ''}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
              />
              {errors.title && (
                <div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle size={14} />
                  <span>{errors.title}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg h-32"
                maxLength={1000}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Price (₦) *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price || ''}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg ${errors.price ? 'border-red-500' : 'border-gray-300'}`}
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
                {errors.price && (
                  <div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
                    <AlertCircle size={14} />
                    <span>{errors.price}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Condition *</label>
                <select
                  name="condition"
                  value={formData.condition || 'used'}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  disabled={loading}
                >
                  <option value="new">New</option>
                  <option value="used">Used</option>
                  <option value="refurbished">Refurbished</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
                <select
                  name="category"
                  value={formData.category || ''}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg ${errors.category ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={loading}
                >
                  <option value="">Select category</option>
                  {MARKETPLACE_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.category && (
                  <div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
                    <AlertCircle size={14} />
                    <span>{errors.category}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Location *</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location || ''}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px] border border-blue-800"
              >
                {loading ? 'Saving...' : 'Save Listing'}
              </button>
            </div>
          </form>
        );

      case 'business':
        return (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium mb-2">Business Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
              />
              {errors.name && (
                <div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle size={14} />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg h-32"
                maxLength={500}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Business Type *</label>
                <select
                  name="business_type"
                  value={formData.business_type || ''}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg ${errors.business_type ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={loading}
                >
                  <option value="">Select type</option>
                  <option value="products">Products</option>
                  <option value="services">Services</option>
                </select>
                {errors.business_type && (
                  <div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
                    <AlertCircle size={14} />
                    <span>{errors.business_type}</span>
                </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category || ''}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg ${errors.category ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={loading}
                  placeholder="e.g., Retail, Service"
                />
                {errors.category && (
                  <div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
                    <AlertCircle size={14} />
                    <span>{errors.category}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Market Area</label>
              <select
                name="location_axis"
                value={formData.location_axis || ''}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                disabled={loading}
              >
                <option value="">Select market area</option>
                {MARKET_AREAS.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <input
                type="text"
                name="address"
                value={formData.address || ''}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Website</label>
              <input
                type="url"
                name="website"
                value={formData.website || ''}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="https://example.com"
                disabled={loading}
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px] border border-blue-800"
              >
                {loading ? 'Saving...' : 'Save Business'}
              </button>
            </div>
          </form>
        );

      case 'job':
        return (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium mb-2">Job Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title || ''}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
              />
              {errors.title && (
                <div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle size={14} />
                  <span>{errors.title}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg h-32"
                maxLength={1000}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Salary</label>
                <input
                  type="text"
                  name="salary"
                  value={formData.salary || ''}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  placeholder="e.g., ₦100,000/month"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Job Type</label>
                <select
                  name="job_type"
                  value={formData.job_type || 'full-time'}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  disabled={loading}
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="remote">Remote</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location || ''}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                disabled={loading}
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px] border border-blue-800"
              >
                {loading ? 'Saving...' : 'Save Job'}
              </button>
            </div>
          </form>
        );

      case 'event':
        return (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium mb-2">Event Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title || ''}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
              />
              {errors.title && (
                <div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle size={14} />
                  <span>{errors.title}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg h-32"
                maxLength={1000}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Event Date & Time *</label>
              <input
                type="datetime-local"
                name="event_date"
                value={formData.event_date || ''}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg ${errors.event_date ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
              />
              {errors.event_date && (
                <div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle size={14} />
                  <span>{errors.event_date}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location || ''}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                disabled={loading}
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px] border border-blue-800"
              >
                {loading ? 'Saving...' : 'Save Event'}
              </button>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'profile': return 'Edit Profile';
      case 'listing': return 'Edit Listing';
      case 'business': return 'Edit Business';
      case 'job': return 'Edit Job';
      case 'event': return 'Edit Event';
      default: return 'Edit';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-gray-200">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{getTitle()}</h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            type="button"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {success && (
          <div className="m-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="text-green-600" size={20} />
            <span className="text-green-700 font-medium">Changes saved successfully!</span>
          </div>
        )}

        {errors.general && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <span className="text-red-700 font-medium">Error</span>
              <p className="text-red-600 text-sm mt-1">{errors.general}</p>
            </div>
          </div>
        )}

        <div className="p-4">
          {renderForm()}
          
          {!loading && !success && (
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all active:scale-[0.98] min-h-[44px]"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditModal;