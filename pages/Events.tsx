import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Calendar, MapPin, Clock, Upload, AlignLeft, Users, Image as ImageIcon, X } from 'lucide-react';
import { Event } from '../types';
import { supabase } from '../services/supabase';

const Events = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState<Event[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    
    // Form state
    const [eventForm, setEventForm] = useState({
        title: '',
        description: '',
        start_time: '',
        location: '',
        image_url: ''
    });
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        // Get current user
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
        };
        getUser();
    }, []);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .order('start_time', { ascending: true })
                    .gte('start_time', new Date().toISOString());

                if (error) throw error;
                
                setEvents(data || []);
            } catch (error) {
                console.error('Error fetching events:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check if file is an image
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }
            
            setSelectedImage(file);
            
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImageToStorage = async (file: File): Promise<string | null> => {
        try {
            setUploading(true);
            
            // Create a unique file name
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `event-images/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('events') // Make sure you have a bucket named 'events'
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from('events')
                .getPublicUrl(filePath);

            return publicUrlData.publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            return null;
        } finally {
            setUploading(false);
        }
    };

    const filteredEvents = events.filter(event => 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatEventDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    const formatEventTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
        });
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEventForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateValue = e.target.value;
        setEventForm(prev => {
            // Combine existing time with new date
            const existingTime = prev.start_time ? new Date(prev.start_time).toTimeString().slice(0, 5) : '12:00';
            const newDateTime = dateValue ? `${dateValue}T${existingTime}:00` : '';
            return {
                ...prev,
                start_time: newDateTime
            };
        });
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const timeValue = e.target.value;
        setEventForm(prev => {
            // Combine existing date with new time
            const existingDate = prev.start_time ? new Date(prev.start_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            const newDateTime = timeValue ? `${existingDate}T${timeValue}:00` : `${existingDate}T12:00:00`;
            return {
                ...prev,
                start_time: newDateTime
            };
        });
    };

    const removeSelectedImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
    };

    const handleCreateEvent = async () => {
        if (!eventForm.title || !eventForm.start_time) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            // Get authenticated user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('Please sign in to create an event');
                return;
            }

            // Check if profile exists
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .single();

            if (!profile) {
                // Create a basic profile for the user
                const { error: createError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: user.id,
                            first_name: user.user_metadata?.full_name?.split(' ')[0] || 'User',
                            email: user.email || '',
                            last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
                            role: 'member',
                            approval_status: 'pending'
                        }
                    ]);

                if (createError) {
                    console.error('Error creating profile:', createError);
                    throw createError;
                }
            }

            // Upload image if selected
            let imageUrl = eventForm.image_url;
            if (selectedImage) {
                const uploadedUrl = await uploadImageToStorage(selectedImage);
                if (uploadedUrl) {
                    imageUrl = uploadedUrl;
                } else {
                    alert('Failed to upload image. Please try again.');
                    return;
                }
            }

            const newEvent = {
                title: eventForm.title,
                description: eventForm.description,
                start_time: eventForm.start_time,
                location: eventForm.location || null,
                image_url: imageUrl || null,
                created_by: user.id,
                created_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('events')
                .insert([newEvent])
                .select()
                .single();

            if (error) throw error;

            // Refresh events list
            const { data: updatedEvents, error: eventsError } = await supabase
                .from('events')
                .select('*')
                .order('start_time', { ascending: true })
                .gte('start_time', new Date().toISOString());

            if (eventsError) throw eventsError;
            
            setEvents(updatedEvents || []);
            setIsCreating(false);
            
            // Reset form
            setEventForm({
                title: '',
                description: '',
                start_time: '',
                location: '',
                image_url: ''
            });
            setSelectedImage(null);
            setImagePreview(null);
            
            alert('Event created successfully!');
        } catch (error) {
            console.error('Error creating event:', error);
            alert('Failed to create event. Please try again.');
        }
    };

    const getInitialDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    const getInitialTime = () => {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    if (isCreating) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
                <div className="sticky top-0 z-40 bg-gradient-to-b from-gray-50 to-blue-50">
                    <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-200/80">
                        <button 
                            onClick={() => setIsCreating(false)}
                            className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-800">Create Event</h1>
                            <p className="text-xs text-gray-500">Share your event with the community</p>
                        </div>
                    </div>
                </div>

                <main className="px-4 pt-4 pb-24 max-w-screen-sm mx-auto">
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/80 p-6 mb-6">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Calendar size={28} className="text-orange-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">New Event Details</h2>
                            <p className="text-sm text-gray-600">Share your event with the community</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700">Event Title *</label>
                                <input 
                                    type="text" 
                                    name="title"
                                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all duration-200 text-sm"
                                    placeholder="e.g. Annual Tech Summit" 
                                    value={eventForm.title}
                                    onChange={handleFormChange}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">Date *</label>
                                    <input 
                                        type="date" 
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all duration-200 text-sm text-gray-600" 
                                        defaultValue={getInitialDate()}
                                        onChange={handleDateChange}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">Time *</label>
                                    <input 
                                        type="time" 
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all duration-200 text-sm text-gray-600" 
                                        defaultValue={getInitialTime()}
                                        onChange={handleTimeChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700">Location</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        name="location"
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all duration-200 text-sm" 
                                        placeholder="Venue Address or Link" 
                                        value={eventForm.location}
                                        onChange={handleFormChange}
                                    />
                                    <MapPin size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700">Description</label>
                                <div className="relative">
                                    <textarea 
                                        name="description"
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all duration-200 text-sm min-h-[120px] resize-none" 
                                        placeholder="What is this event about?"
                                        value={eventForm.description}
                                        onChange={handleFormChange}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700">Cover Image</label>
                                
                                {/* Image Preview */}
                                {imagePreview ? (
                                    <div className="relative">
                                        <img 
                                            src={imagePreview} 
                                            alt="Preview" 
                                            className="w-full h-48 object-cover rounded-xl border border-gray-200"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeSelectedImage}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        {/* File Upload */}
                                        <label className="block">
                                            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-blue-300 transition-colors cursor-pointer">
                                                <Upload size={24} className="mb-2" />
                                                <span className="text-sm font-medium mb-1">Upload Cover Image</span>
                                                <span className="text-xs text-gray-500">JPG, PNG up to 5MB</span>
                                            </div>
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={handleImageSelect}
                                            />
                                        </label>
                                        
                                        {/* Or URL Input */}
                                        <div className="mt-3">
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    name="image_url"
                                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all duration-200 text-sm" 
                                                    placeholder="Or paste image URL" 
                                                    value={eventForm.image_url}
                                                    onChange={handleFormChange}
                                                />
                                                <ImageIcon size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={handleCreateEvent}
                                disabled={uploading}
                                className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200/50 active:scale-[0.98] transition-all duration-200 text-sm mt-4 ${
                                    uploading ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                            >
                                {uploading ? 'Uploading Image...' : 'Publish Event'}
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-gradient-to-b from-gray-50 to-blue-50">
                <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-200/80">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => navigate(-1)}
                            className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-800">All Events</h1>
                            <p className="text-xs text-gray-500">Discover upcoming events</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-200/50 flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                        <Plus size={18} />
                        Create
                    </button>
                </div>
            </div>

            {/* Main Content - MATCHING EXPLORE PAGE WIDTH */}
            <main className="px-4 pt-4 pb-24 max-w-screen-sm mx-auto">
                {/* Search Bar */}
                <div className="mb-6">
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/80 p-4">
                        <div className="relative mb-3 group">
                            <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center">
                                <Search className="text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                            </div>
                            <input
                                type="text"
                                className="w-full pl-12 pr-12 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                                placeholder="Search events by title, location..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center text-gray-400 hover:text-gray-600"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Events List */}
                <div>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600 font-medium">Loading events...</p>
                        </div>
                    ) : filteredEvents.length > 0 ? (
                        <div className="space-y-4">
                            {filteredEvents.map(event => {
                                const eventDate = new Date(event.start_time);
                                const dayOfWeek = eventDate.toLocaleDateString('en-US', { weekday: 'short' });
                                const dayOfMonth = eventDate.getDate();
                                const month = eventDate.toLocaleDateString('en-US', { month: 'short' });
                                
                                return (
                                    <div 
                                        key={event.id}
                                        onClick={() => navigate(`/event/${event.id}`)}
                                        className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden hover:shadow-xl transition-shadow active:scale-[0.98]"
                                    >
                                        <div className="flex">
                                            {/* Date Box */}
                                            <div className="w-20 min-h-full bg-gradient-to-br from-orange-500 to-orange-600 flex flex-col items-center justify-center p-3">
                                                <span className="text-white text-xs font-bold uppercase">
                                                    {dayOfWeek}
                                                </span>
                                                <span className="text-white text-2xl font-bold leading-none">
                                                    {dayOfMonth}
                                                </span>
                                                <span className="text-white text-xs">
                                                    {month}
                                                </span>
                                            </div>

                                            {/* Event Details */}
                                            <div className="flex-1 p-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2">
                                                            {event.title}
                                                        </h3>
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                                <Clock size={12} />
                                                                <span>{formatEventTime(event.start_time)}</span>
                                                            </div>
                                                            {event.location && (
                                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                                    <MapPin size={12} />
                                                                    <span className="line-clamp-1">{event.location}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {event.image_url && (
                                                        <div className="ml-3 w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                                            <img 
                                                                src={event.image_url} 
                                                                alt={event.title} 
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/80 p-8 text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-8 h-8 text-orange-600" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 mb-2">
                                {searchTerm ? 'No Events Found' : 'No Upcoming Events'}
                            </h4>
                            <p className="text-gray-600 text-sm mb-6">
                                {searchTerm 
                                    ? 'Try changing your search terms' 
                                    : 'Be the first to create an event in your community'}
                            </p>
                            <button 
                                onClick={() => setIsCreating(true)}
                                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-bold px-6 py-3 rounded-lg transition-colors active:scale-95"
                            >
                                Create Event
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Events;