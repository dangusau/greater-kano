import React, { useState, useCallback } from 'react';
import { X, Calendar, MapPin, Clock, CalendarDays, FileText } from 'lucide-react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: any) => Promise<void>;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const getTomorrowDate = useCallback((): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !eventDate || !eventTime) return;

    setLoading(true);

    try {
      const fullDateTime = `${eventDate}T${eventTime}:00`;
      
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        event_date: fullDateTime,
        location: location.trim(),
      });

      resetForm();
      onClose();
    } catch {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  }, [title, description, eventDate, eventTime, location, onSubmit, onClose]);

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setEventDate('');
    setEventTime('');
    setLocation('');
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-title"
    >
      <div className="w-full max-w-md max-h-[90vh] overflow-hidden bg-white rounded-t-2xl md:rounded-2xl 
                    border border-blue-200 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg 
                            flex items-center justify-center">
                <CalendarDays size={16} className="text-white" />
              </div>
              <div>
                <h2 id="create-event-title" className="text-sm font-bold text-gray-900">Create Event</h2>
                <p className="text-xs text-gray-500">Organize a business event</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 
                       active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              aria-label="Close modal"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          <form onSubmit={handleSubmit} className="p-3 space-y-3">
            {/* Event Title */}
            <div className="space-y-1">
              <label htmlFor="event-title" className="block text-xs font-medium text-gray-700">
                Event Title *
              </label>
              <div className="relative group">
                <CalendarDays className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 
                                       group-focus-within:text-purple-600 transition-colors" size={16} />
                <input
                  id="event-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Networking Mixer, Business Conference"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-blue-200 rounded-lg text-xs 
                           focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all
                           min-h-[36px]"
                  required
                  autoComplete="off"
                  aria-required="true"
                />
              </div>
            </div>

            {/* Event Description */}
            <div className="space-y-1">
              <label htmlFor="event-description" className="block text-xs font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your event agenda, speakers, and what attendees can expect..."
                className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs 
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 
                         transition-all h-24 resize-none"
                maxLength={1000}
                aria-describedby="description-help"
              />
              <div id="description-help" className="flex justify-between text-xs text-gray-500">
                <span>Optional but recommended</span>
                <span>{description.length}/1000</span>
              </div>
            </div>

            {/* Date & Time Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Date */}
              <div className="space-y-1">
                <label htmlFor="event-date" className="block text-xs font-medium text-gray-700">
                  Date *
                </label>
                <div className="relative group">
                  <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 
                                     group-focus-within:text-purple-600 transition-colors pointer-events-none" size={16} />
                  <input
                    id="event-date"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    min={getTomorrowDate()}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-blue-200 rounded-lg text-xs 
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 
                             transition-all cursor-pointer min-h-[36px]"
                    required
                    aria-required="true"
                  />
                </div>
              </div>

              {/* Time */}
              <div className="space-y-1">
                <label htmlFor="event-time" className="block text-xs font-medium text-gray-700">
                  Time *
                </label>
                <div className="relative group">
                  <Clock className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 
                                  group-focus-within:text-blue-600 transition-colors pointer-events-none" size={16} />
                  <input
                    id="event-time"
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-blue-200 rounded-lg text-xs 
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 
                             transition-all cursor-pointer min-h-[36px]"
                    required
                    aria-required="true"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-1">
              <label htmlFor="event-location" className="block text-xs font-medium text-gray-700">
                Location
              </label>
              <div className="relative group">
                <MapPin className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 
                                 group-focus-within:text-green-600 transition-colors" size={16} />
                <input
                  id="event-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Lagos Business Hub, Virtual Meeting"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-blue-200 rounded-lg text-xs 
                           focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all
                           min-h-[36px]"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !title.trim() || !eventDate || !eventTime}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white 
                       font-bold py-2 rounded-lg shadow-md hover:shadow-lg 
                       hover:from-purple-700 hover:to-pink-700 
                       disabled:opacity-50 disabled:cursor-not-allowed 
                       active:scale-[0.99] transition-all duration-200 
                       focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-xs min-h-[36px]"
              aria-label={loading ? 'Creating event...' : 'Create event'}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-1">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Event...</span>
                </div>
              ) : (
                'Create Event'
              )}
            </button>
          </form>
        </div>

        {/* Bottom Safe Area Spacer */}
        <div className="h-2 md:h-0" />
      </div>
    </div>
  );
};

export default CreateEventModal;