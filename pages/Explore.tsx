import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Plus, Briefcase, Calendar, AlertCircle, X } from 'lucide-react';
import { useExplore } from '../hooks/useExplore';
import JobCard from '../components/explore/JobCard';
import EventCard from '../components/explore/EventCard';
import CreateJobModal from '../components/explore/CreateJobModal';
import CreateEventModal from '../components/explore/CreateEventModal';

const Explore: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'events'>('jobs');
  const [showJobModal, setShowJobModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { 
    jobs, 
    events, 
    loading, 
    isVerified,
    showVerificationAlert, 
    getJobs, 
    getEvents,
    createJob,  // FIXED: Added back createJob
    createEvent, // FIXED: Added back createEvent
    setShowVerificationAlert 
  } = useExplore();

  const loadData = useCallback(() => {
    if (activeTab === 'jobs') {
      getJobs({ search: searchQuery }, false);
    } else {
      getEvents({ search: searchQuery }, false);
    }
  }, [activeTab, searchQuery, getJobs, getEvents]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateClick = useCallback(() => {
    if (!isVerified) {
      setShowVerificationAlert(true);
      return;
    }
    
    if (activeTab === 'jobs') {
      setShowJobModal(true);
    } else {
      setShowEventModal(true);
    }
  }, [activeTab, isVerified, setShowVerificationAlert]);

  const handleCreateJob = useCallback(async (jobData: any) => {
    try {
      await createJob(jobData); // FIXED: Now using createJob from hook
      setShowJobModal(false);
    } catch {
      // Error handled in hook
    }
  }, [createJob]); // FIXED: Added dependency

  const handleCreateEvent = useCallback(async (eventData: any) => {
    try {
      await createEvent(eventData); // FIXED: Now using createEvent from hook
      setShowEventModal(false);
    } catch {
      // Error handled in hook
    }
  }, [createEvent]); // FIXED: Added dependency

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white safe-area">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 border-b border-blue-800">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-sm font-bold mb-1">Explore</h1>
          <p className="text-blue-100 text-xs">Find jobs and events in GKBC community</p>
        </div>
      </div>

      {/* Verification Alert */}
      {showVerificationAlert && (
        <div className="animate-fade-in px-3 pt-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-3">
            <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-yellow-800 text-xs">Verified Members Only</h4>
              <p className="text-yellow-700 text-xs">Contact support to upgrade your account.</p>
            </div>
            <button 
              onClick={() => setShowVerificationAlert(false)}
              className="text-yellow-600 hover:text-yellow-800 p-2"
              aria-label="Close alert"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="sticky top-0 bg-white border-b border-blue-200 z-10 p-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'jobs' ? "Search jobs..." : "Search events..."}
              className="w-full pl-10 pr-3 py-2 bg-white rounded-lg border border-blue-300 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs 
                       min-h-[36px]"
              aria-label={`Search ${activeTab}`}
            />
          </div>
          <button 
            className="p-2 bg-white rounded-lg border border-blue-300 hover:bg-blue-50 
                     min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Filter results"
          >
            <Filter size={16} className="text-blue-600" />
          </button>
          <button 
            onClick={handleCreateClick}
            className={`p-2 rounded-lg border min-h-[36px] min-w-[36px] flex items-center justify-center ${
              isVerified
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 border-blue-700'
                : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
            }`}
            aria-label={activeTab === 'jobs' ? "Post a job" : "Create an event"}
            title={isVerified 
              ? activeTab === 'jobs' ? "Post a job" : "Create an event" 
              : "Verified members only"}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-blue-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex-1 py-2 text-center font-medium transition-colors min-h-[36px] ${
              activeTab === 'jobs'
                ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            aria-label="Show jobs"
          >
            <div className="flex items-center justify-center gap-2">
              <Briefcase size={14} />
              <span className="text-xs">Jobs</span>
              {jobs.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {jobs.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 py-2 text-center font-medium transition-colors min-h-[36px] ${
              activeTab === 'events'
                ? 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-b-2 border-purple-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            aria-label="Show events"
          >
            <div className="flex items-center justify-center gap-2">
              <Calendar size={14} />
              <span className="text-xs">Events</span>
              {events.length > 0 && (
                <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {events.length}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-3 border border-blue-200 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg border border-blue-200"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'jobs' ? (
          <div className="space-y-3">
            {jobs.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center border border-blue-200">
                  <Briefcase size={24} className="text-blue-500" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">No jobs found</h3>
                <p className="text-xs text-gray-600 mb-3">
                  {isVerified 
                    ? 'Be the first to post a job!' 
                    : 'No jobs found at the moment.'}
                </p>
                <button
                  onClick={handleCreateClick}
                  className={`px-4 py-2 rounded-lg font-medium shadow-md text-xs min-h-[36px] ${
                    isVerified
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                      : 'bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed'
                  }`}
                  aria-label={isVerified ? "Post a job" : "Upgrade to post job"}
                  title={isVerified ? "Post a job" : "Verified members only"}
                >
                  {isVerified ? 'Post a Job' : 'Verified Members Only'}
                </button>
              </div>
            ) : (
              jobs.map(job => <JobCard key={job.id} job={job} />)
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full mx-auto mb-3 flex items-center justify-center border border-purple-200">
                  <Calendar size={24} className="text-purple-500" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">No events found</h3>
                <p className="text-xs text-gray-600 mb-3">
                  {isVerified 
                    ? 'Be the first to create an event!' 
                    : 'No events found at the moment.'}
                </p>
                <button
                  onClick={handleCreateClick}
                  className={`px-4 py-2 rounded-lg font-medium shadow-md text-xs min-h-[36px] ${
                    isVerified
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800'
                      : 'bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed'
                  }`}
                  aria-label={isVerified ? "Create an event" : "Upgrade to create event"}
                  title={isVerified ? "Create an event" : "Verified members only"}
                >
                  {isVerified ? 'Create Event' : 'Verified Members Only'}
                </button>
              </div>
            ) : (
              events.map(event => <EventCard key={event.id} event={event} />)
            )}
          </div>
        )}
      </div>

      {/* Floating Create Button */}
      <button 
        onClick={handleCreateClick}
        className={`fixed bottom-20 right-3 text-white p-3 rounded-full shadow-lg border z-30 
                   min-h-[44px] min-w-[44px] flex items-center justify-center ${
          isVerified
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-blue-800'
            : 'bg-gray-400 border-gray-500 cursor-not-allowed'
        }`}
        aria-label={activeTab === 'jobs' ? "Post a job" : "Create an event"}
        title={isVerified 
          ? activeTab === 'jobs' ? "Post a job" : "Create an event" 
          : "Verified members only"}
      >
        <Plus size={20} />
      </button>

      {/* Modals */}
      <CreateJobModal
        isOpen={showJobModal}
        onClose={() => setShowJobModal(false)}
        onSubmit={handleCreateJob}
      />
      <CreateEventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSubmit={handleCreateEvent}
      />
    </div>
  );
};

export default Explore;