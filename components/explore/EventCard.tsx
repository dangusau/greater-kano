// Updated EventCard.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, MapPin, Users, Clock, Check, ChevronRight, CheckCircle } from 'lucide-react';
import { Event } from '../../types/explore';
import { formatTimeAgo } from '../../utils/formatters';
import { useExplore } from '../../hooks/useExplore';
import { useAuth } from '../../contexts/AuthContext';

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const [localEvent, setLocalEvent] = useState(event);
  const { toggleRSVP } = useExplore();
  const { user } = useAuth();

  const isOwner = useMemo(() => 
    event.organizer_id === user?.id, 
    [event.organizer_id, user]
  );

  const hasRSVPed = useMemo(() => 
    localEvent.user_rsvp_status !== null, 
    [localEvent.user_rsvp_status]
  );

  const formatEventDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const handleRSVP = useCallback(async (status: string): Promise<void> => {
    if (isOwner) return;
    if (hasRSVPed) return;

    try {
      const result = await toggleRSVP(event.id, status);
      setLocalEvent(prev => ({
        ...prev,
        rsvp_count: result.rsvp_count,
        user_rsvp_status: result.rsvp_status
      }));
    } catch {
      // Error handled in hook
    }
  }, [event.id, isOwner, hasRSVPed, toggleRSVP]);

  const getRSVPButtonStyle = useCallback((): string => {
    if (isOwner) {
      return "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200 cursor-default";
    }
    
    if (hasRSVPed) {
      return "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md cursor-default";
    }
    
    return "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg active:scale-[0.98]";
  }, [isOwner, hasRSVPed]);

  const getButtonText = useCallback((): string => {
    if (isOwner) return "Your Event";
    if (hasRSVPed) {
      return localEvent.user_rsvp_status === 'going' ? "Going ✓" : "Interested ✓";
    }
    return "RSVP Now";
  }, [isOwner, hasRSVPed, localEvent.user_rsvp_status]);

  const getRSVPCountText = useCallback((): string => {
    if (localEvent.rsvp_count === 0) return "No RSVPs yet";
    if (localEvent.rsvp_count === 1) return "1 person going";
    return `${localEvent.rsvp_count} people going`;
  }, [localEvent.rsvp_count]);

  return (
    <div className="group bg-white rounded-xl shadow-lg border border-blue-200/50 overflow-hidden 
                  hover:shadow-xl hover:border-blue-300 
                  active:scale-[0.995] transition-all duration-200 
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20"
         role="article"
         aria-label={`${event.title} event organized by ${event.organizer_name}`}>
      
      {/* Event Header */}
      <div className="relative">
        {/* Event Image or Gradient Placeholder */}
        {event.image_url ? (
          <div className="h-36 bg-gradient-to-r from-blue-500/20 to-purple-500/20 relative overflow-hidden">
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <Calendar size={32} class="text-white/80" />
                    </div>
                  `;
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="h-36 bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center relative">
            <Calendar size={32} className="text-white/80" />
          </div>
        )}

        {/* Event Status Badge */}
        <div className="absolute top-3 right-3">
          <div className="bg-white/90 backdrop-blur-sm text-gray-900 px-2 py-1 rounded-full 
                        text-xs font-medium shadow-md flex items-center gap-1 border border-white/50">
            <Users size={12} className="text-purple-600" />
            <span className="font-bold text-gray-900">{localEvent.rsvp_count}</span>
          </div>
        </div>

        {/* Owner Badge */}
        {isOwner && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-blue-600 to-purple-600 
                        text-white px-2 py-1 rounded-full text-xs font-medium shadow-md 
                        border border-blue-500/30">
            Your Event
          </div>
        )}
      </div>

      {/* Event Content */}
      <div className="p-3">
        {/* Event Title */}
        <div className="flex items-center gap-1 mb-2">
          <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">
            {event.title}
          </h3>
          {event.organizer_verified && (
            <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
          )}
        </div>

        {/* Organizer Information */}
        <div className="flex items-center gap-2 mb-3 p-2 bg-gradient-to-r from-blue-50 to-purple-50 
                      rounded-lg border border-blue-100">
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full 
                          flex items-center justify-center text-white text-xs font-bold shadow-sm 
                          border-2 border-white">
              {event.organizer_name?.charAt(0).toUpperCase() || 'O'}
            </div>
            {event.organizer_verified && (
              <div className="absolute -top-1 -right-1">
                <CheckCircle size={10} className="text-green-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 font-medium">Organized by</div>
            <div className="font-semibold text-gray-900 text-xs truncate flex items-center gap-1">
              {event.organizer_name}
            </div>
          </div>
        </div>

        {/* Event Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {/* Date & Time */}
          <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-blue-100/50 
                        rounded-lg border border-blue-200">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg 
                          flex items-center justify-center flex-shrink-0">
              <Calendar size={14} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 font-medium">Date & Time</div>
              <div className="font-semibold text-gray-900 text-xs">
                {formatEventDate(event.event_date)}
              </div>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-green-50 to-green-100/50 
                          rounded-lg border border-green-200">
              <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg 
                            flex items-center justify-center flex-shrink-0">
                <MapPin size={14} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 font-medium">Location</div>
                <div className="font-semibold text-gray-900 text-xs truncate">
                  {event.location}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Event Description */}
        {event.description && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1 font-medium">
              About this event
            </div>
            <p className="text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100/50 
                        p-2 rounded-lg text-xs line-clamp-2 border border-gray-200">
              {event.description}
            </p>
          </div>
        )}

        {/* RSVP Button */}
        <button
          onClick={() => handleRSVP('going')}
          disabled={isOwner || hasRSVPed}
          className={`w-full py-2 rounded-lg font-bold flex items-center justify-center gap-1 
                    transition-all duration-200 text-xs min-h-[36px] ${getRSVPButtonStyle()}`}
          aria-label={isOwner ? "Your event" : hasRSVPed ? "Already RSVPed" : "RSVP to this event"}
        >
          {hasRSVPed && !isOwner && <Check size={16} />}
          <span className="font-semibold">{getButtonText()}</span>
        </button>

        {/* Status Messages */}
        <div className="mt-2 space-y-1">
          {isOwner && (
            <p className="text-center text-blue-600 text-xs font-medium bg-blue-50 px-2 py-1 rounded-full">
              You are the organizer
            </p>
          )}
          {hasRSVPed && !isOwner && (
            <p className="text-center text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
              You are {localEvent.user_rsvp_status === 'going' ? 'going' : 'interested'}
            </p>
          )}
        </div>

        {/* Posted Time */}
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">
          <Clock size={10} className="text-gray-400" />
          <span className="font-medium">Posted {formatTimeAgo(event.created_at)}</span>
        </div>
      </div>
    </div>
  );
};

export default EventCard;