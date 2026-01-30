import React, { useState, useCallback } from 'react';
import { X, Upload, DollarSign, MapPin, Camera, AlertCircle, Info } from 'lucide-react';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (listingData: any) => Promise<void>;
}

const CATEGORIES = [
  'All', 'Electronics', 'Fashion', 'Vehicles', 'Property', 'Services', 'Others'
];

const CONDITIONS = [
  { value: 'new', label: 'Brand New' },
  { value: 'used', label: 'Used - Good' },
  { value: 'refurbished', label: 'Refurbished' }
];

const MAX_IMAGES = 5;

const CreateListingModal: React.FC<CreateListingModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit 
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('used');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'Title is required';
    } else if (title.length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }

    if (!price) {
      errors.price = 'Price is required';
    } else if (parseFloat(price) <= 0) {
      errors.price = 'Price must be greater than 0';
    }

    if (!category) {
      errors.category = 'Category is required';
    }

    if (!location.trim()) {
      errors.location = 'Location is required';
    }

    if (images.length === 0) {
      errors.images = 'At least one image is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [title, price, category, location, images]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setUploading(true);

    try {
      const listingData = {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        category,
        condition,
        location: location.trim(),
        images
      };

      await onSubmit(listingData);
      resetForm();
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setUploading(false);
    }
  }, [title, description, price, category, condition, location, images, validateForm, onSubmit, onClose]);

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setPrice('');
    setCategory('');
    setCondition('used');
    setLocation('');
    setImages([]);
    setFormErrors({});
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files);
    
    const validFiles = newFiles.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024;
      return isValidType && isValidSize;
    });

    const totalImages = images.length + validFiles.length;
    if (totalImages > MAX_IMAGES) {
      return;
    }

    setImages(prev => [...prev, ...validFiles].slice(0, MAX_IMAGES));
    e.target.value = '';
  }, [images]);

  const removeImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleClose = useCallback(() => {
    const hasUnsavedChanges = title || description || price || category || location || images.length > 0;
    
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        resetForm();
        onClose();
      }
    } else {
      resetForm();
      onClose();
    }
  }, [title, description, price, category, location, images, resetForm, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-3 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full md:max-w-2xl max-h-[90vh] md:max-h-[80vh] overflow-y-auto 
                     rounded-t-xl md:rounded-xl shadow-lg border border-blue-200">
        
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-200 
                       p-3 md:p-4 flex items-center justify-between backdrop-blur-sm z-10">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Create New Listing</h2>
            <p className="text-xs text-gray-600 mt-0.5">Sell your items on GKBC Marketplace</p>
          </div>
          <button 
            onClick={handleClose}
            className="p-1 hover:bg-white/80 rounded-full transition-colors active:scale-95 
                      focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 md:p-4 space-y-4 md:space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">
              Product Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formErrors.title) {
                  setFormErrors(prev => ({ ...prev, title: '' }));
                }
              }}
              placeholder="What are you selling?"
              className={`w-full p-2 border rounded-lg text-xs focus:outline-none 
                        focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                formErrors.title ? 'border-red-300' : 'border-blue-200'
              }`}
              required
              maxLength={100}
            />
            {formErrors.title && (
              <div className="flex items-center gap-1 text-red-600 text-xs">
                <AlertCircle size={10} />
                <span>{formErrors.title}</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your item in detail..."
              className="w-full p-2 border border-blue-200 rounded-lg text-xs 
                        focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 
                        transition-all h-24 resize-none"
              maxLength={1000}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Optional</span>
              <span>{description.length}/1000</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">
                Price (₦) *
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center">
                  <DollarSign className="text-gray-400" size={16} />
                </div>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    if (formErrors.price) {
                      setFormErrors(prev => ({ ...prev, price: '' }));
                    }
                  }}
                  placeholder="0.00"
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg text-xs 
                            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 
                            transition-all ${
                    formErrors.price ? 'border-red-300' : 'border-blue-200'
                  }`}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              {formErrors.price && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                  <AlertCircle size={10} />
                  <span>{formErrors.price}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (formErrors.category) {
                    setFormErrors(prev => ({ ...prev, category: '' }));
                  }
                }}
                className={`w-full p-2 border rounded-lg text-xs 
                          focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 
                          transition-all ${
                  formErrors.category ? 'border-red-300' : 'border-blue-200'
                }`}
                required
              >
                <option value="">Select category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="py-1">{cat}</option>
                ))}
              </select>
              {formErrors.category && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                  <AlertCircle size={10} />
                  <span>{formErrors.category}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">
                Condition *
              </label>
              <div className="grid grid-cols-3 gap-1">
                {CONDITIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCondition(value)}
                    className={`p-2 rounded-lg border text-xs font-medium transition-all min-h-[36px] ${
                      condition === value
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">
                Location *
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center">
                  <MapPin className="text-gray-400" size={16} />
                </div>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (formErrors.location) {
                      setFormErrors(prev => ({ ...prev, location: '' }));
                    }
                  }}
                  placeholder="City, State"
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg text-xs 
                            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 
                            transition-all ${
                    formErrors.location ? 'border-red-300' : 'border-blue-200'
                  }`}
                  required
                />
              </div>
              {formErrors.location && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                  <AlertCircle size={10} />
                  <span>{formErrors.location}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700">
                Product Images *
              </label>
              <span className="text-xs text-gray-500">
                {images.length}/{MAX_IMAGES}
              </span>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {images.map((file, index) => (
                <div 
                  key={index} 
                  className="relative aspect-square rounded-lg overflow-hidden border border-blue-200 
                            group hover:border-blue-400 transition-all"
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/80 text-white rounded-full 
                              flex items-center justify-center opacity-0 group-hover:opacity-100 
                              transition-opacity hover:bg-black active:scale-95 
                              focus:outline-none focus:ring-2 focus:ring-white/50 min-w-[24px] min-h-[24px]"
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <X size={12} />
                  </button>
                  {index === 0 && (
                    <div className="absolute top-1 left-1 px-1 py-0.5 bg-gradient-to-r from-blue-600 to-blue-700 
                                  text-white text-xs font-medium rounded-full">
                      Cover
                    </div>
                  )}
                </div>
              ))}
              
              {images.length < MAX_IMAGES && (
                <label className="aspect-square border border-dashed border-blue-300 rounded-lg 
                                flex flex-col items-center justify-center cursor-pointer 
                                hover:border-blue-500 hover:bg-blue-50 active:scale-95 
                                transition-all group focus-within:border-blue-500 focus-within:ring-2 
                                focus-within:ring-blue-500/20">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 
                                flex items-center justify-center mb-2">
                    <Camera size={16} className="text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-blue-700">Add Photo</span>
                  <span className="text-xs text-gray-500 mt-0.5">Tap to select</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            
            {formErrors.images && (
              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
                <p className="text-red-700 text-xs">{formErrors.images}</p>
              </div>
            )}
          </div>

          <div className="mt-3">
            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium 
                        py-2 rounded-lg shadow hover:shadow-md hover:from-blue-700 hover:to-blue-800 
                        disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] 
                        transition-all duration-200 flex items-center justify-center gap-2 
                        focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[44px] mb-3 text-xs"
              aria-label={uploading ? 'Creating listing...' : 'Post listing'}
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>Post Listing</span>
                  <Upload size={16} />
                </>
              )}
            </button>
          </div>

          <div className="flex items-start gap-2 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 
                        border border-blue-200 rounded-lg">
            <Info size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-blue-800 text-xs font-medium mb-0.5">Photo Guidelines</p>
              <ul className="text-blue-700 text-xs space-y-0.5">
                <li>• Upload up to {MAX_IMAGES} clear photos</li>
                <li>• First photo is cover image</li>
                <li>• Use good lighting</li>
                <li>• Max 5MB per photo</li>
              </ul>
            </div>
          </div>
          
          <p className="text-center text-xs text-gray-500">
            Your listing will be visible to GKBC members
          </p>
        </form>
      </div>
    </div>
  );
};

export default CreateListingModal;