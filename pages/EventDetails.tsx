import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, Users, Share2, User, Globe, Info } from 'lucide-react';
import { Event } from '../types';
import { supabase } from '../services/supabase';

const EventDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [organizer, setOrganizer] = useState<any>(null);

    useEffect(() => {
        const fetchEvent = async () => {
            if (!id) return;
            
            try {
                setLoading(true);
                
                // Fetch event from database with organizer details
                const { data, error } = await supabase
                    .from('events')
                    .select(`
                        *,
                        organizer:profiles!events_created_by_fkey (
                            id,
                            first_name,
                            last_name,
                            avatar_url,
                            email
                        )
                    `)
                    .eq('id', id)
                    .single();

                if (error) throw error;
                
                setEvent(data);
                
                // Set organizer info
                if (data.organizer) {
                    setOrganizer(data.organizer);
                }
                
            } catch (error) {
                console.error('Error fetching event:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchEvent();
    }, [id]);

    const formatEventDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatEventTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            timeZoneName: 'short'
        });
    };

    const formatEventDateTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            year: 'numeric'
        });
    };

    const handleShare = async () => {
        if (navigator.share && event) {
            try {
                await navigator.share({
                    title: event.title,
                    text: `Check out this event: ${event.title}`,
                    url: window.location.href,
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href)
                .then(() => alert('Event link copied to clipboard!'))
                .catch(err => console.error('Failed to copy:', err));
        }
    };

    const getGoogleMapsLink = (location: string) => {
        // Simple check for URL vs address
        if (location.startsWith('http')) {
            return location;
        }
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    };

    const isOnlineEvent = (location: string) => {
        return location && (location.includes('zoom') || 
                          location.includes('meet.google') || 
                          location.includes('teams') ||
                          location.includes('http') ||
                          location.includes('online') ||
                          location.includes('virtual'));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 flex flex-col items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading event...</p>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 flex flex-col items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar size={24} className="text-gray-400" />
                    </div>
                    <h3 className="text-gray-900 font-bold text-lg mb-2">Event Not Found</h3>
                    <p className="text-gray-600 text-sm mb-6">The event you're looking for doesn't exist or has been removed.</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-bold px-6 py-3 rounded-lg transition-colors active:scale-95"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const onlineEvent = event.location && isOnlineEvent(event.location);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
            {/* Custom Header */}
            <div className="sticky top-0 z-40 bg-gradient-to-b from-gray-50 to-blue-50">
                <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-200/80">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-gray-800">Event Details</h1>
                        <p className="text-xs text-gray-500 truncate">{event.title}</p>
                    </div>
                    <button 
                        onClick={handleShare}
                        className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                    >
                        <Share2 size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content - MATCHING EXPLORE PAGE WIDTH */}
            <main className="px-4 pt-4 pb-8 max-w-screen-sm mx-auto">
                {/* Event Image */}
                <div className="mb-6">
                    <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl overflow-hidden h-64 relative">
                        {event.image_url ? (
                            <img 
                                src={event.image_url} 
                                alt={event.title} 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Calendar size={48} className="text-orange-400" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Event Status Badge */}
                <div className="mb-6">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 text-xs font-bold rounded-full border border-orange-200">
                            <Calendar size={12} className="mr-1.5" />
                            Upcoming Event
                        </span>
                        {onlineEvent && (
                            <span className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                                <Globe size={12} className="mr-1.5" />
                                Online Event
                            </span>
                        )}
                    </div>
                </div>

                {/* Event Title */}
                <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-6">{event.title}</h1>

                {/* Event Details Card */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden mb-6">
                    <div className="p-6">
                        {/* Date & Time */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <Calendar size={16} className="text-gray-500" />
                                Date & Time
                            </h3>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <div className="w-10 h-10 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg flex items-center justify-center text-orange-600 shrink-0">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{formatEventDate(event.start_time)}</p>
                                        <p className="text-sm text-gray-600">{formatEventTime(event.start_time)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Location/Venue */}
                        {event.location && (
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <MapPin size={16} className="text-gray-500" />
                                    {onlineEvent ? 'Event Link/Venue' : 'Location'}
                                </h3>
                                <div className="space-y-2">
                                    <div className="p-3 bg-gray-50 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                                                {onlineEvent ? <Globe size={20} /> : <MapPin size={20} />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-gray-900 mb-1">
                                                    {onlineEvent ? 'Online Event' : 'Physical Location'}
                                                </p>
                                                <p className="text-sm text-gray-600 mb-2">{event.location}</p>
                                                {onlineEvent ? (
                                                    <a 
                                                        href={event.location.startsWith('http') ? event.location : `https://${event.location}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                                                    >
                                                        Join Event Link
                                                        <ArrowLeft size={14} className="rotate-180" />
                                                    </a>
                                                ) : (
                                                    <a 
                                                        href={getGoogleMapsLink(event.location)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                                                    >
                                                        Open in Maps
                                                        <ArrowLeft size={14} className="rotate-180" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Organizer */}
                        {organizer && (
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <User size={16} className="text-gray-500" />
                                    Event Organizer
                                </h3>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                                            {organizer.avatar_url ? (
                                                <img 
                                                    src={organizer.avatar_url} 
                                                    alt={`${organizer.first_name} ${organizer.last_name}`}
                                                    className="w-full h-full rounded-full object-cover"
                                                />
                                            ) : (
                                                `${organizer.first_name?.charAt(0) || 'U'}${organizer.last_name?.charAt(0) || ''}`
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">
                                                {organizer.first_name} {organizer.last_name || ''}
                                            </p>
                                            <p className="text-xs text-gray-500">{organizer.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* About Event */}
                        {event.description && (
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Info size={16} className="text-gray-500" />
                                    About This Event
                                </h3>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                                        {event.description}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Event Metadata */}
                        <div className="pt-6 border-t border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Event Information</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm text-gray-600">Event ID</span>
                                    <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                        {event.id.substring(0, 8)}...
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm text-gray-600">Created</span>
                                    <span className="text-sm text-gray-900">
                                        {new Date(event.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm text-gray-600">Full Date & Time</span>
                                    <span className="text-sm text-gray-900 text-right">
                                        {formatEventDateTime(event.start_time)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Share Section */}
                <div className="mb-8">
                    <div className="bg-gradient-to-r from-blue-600/10 to-blue-500/10 backdrop-blur-sm rounded-2xl border border-blue-200/50 p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mb-3">
                                <Share2 size={24} className="text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Share this Event</h3>
                            <p className="text-sm text-gray-600 mb-4">Let others know about this event</p>
                            <button 
                                onClick={handleShare}
                                className="w-full max-w-xs bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200/50 active:scale-[0.98] transition-all"
                            >
                                Share Event
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EventDetails;