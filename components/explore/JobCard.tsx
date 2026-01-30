import React, { useCallback } from 'react';
import { MapPin, Briefcase, Clock, Mail, Phone, Building, Award, CheckCircle } from 'lucide-react';
import { Job } from '../../types/explore';
import { formatTimeAgo } from '../../utils/formatters';

interface JobCardProps {
  job: Job;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const formatSalary = useCallback((salary: string): string => {
    if (!salary) return '';
    if (salary.toLowerCase().includes('negotiable') || salary.toLowerCase().includes('competitive')) {
      return salary;
    }
    return salary.startsWith('₦') || salary.startsWith('$') || salary.startsWith('€') || salary.startsWith('£') 
      ? salary 
      : `₦${salary}`;
  }, []);

  const getCompanyAvatar = useCallback(() => {
    if (job.company_avatar) {
      return (
        <img 
          src={job.company_avatar} 
          alt={job.company_name} 
          className="w-full h-full object-cover rounded-xl"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.innerHTML = `
              <span class="text-white font-bold text-sm">
                ${job.company_name?.charAt(0) || 'C'}
              </span>
            `;
          }}
        />
      );
    }
    return (
      <span className="text-white font-bold text-sm">
        {job.company_name?.charAt(0) || 'C'}
      </span>
    );
  }, [job.company_avatar, job.company_name]);

  const getJobTypeStyle = useCallback((): string => {
    switch (job.job_type?.toLowerCase()) {
      case 'full-time':
        return 'bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-200 text-blue-700';
      case 'part-time':
        return 'bg-gradient-to-r from-green-100 to-green-50 border border-green-200 text-green-700';
      case 'contract':
        return 'bg-gradient-to-r from-purple-100 to-purple-50 border border-purple-200 text-purple-700';
      case 'remote':
        return 'bg-gradient-to-r from-orange-100 to-orange-50 border border-orange-200 text-orange-700';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200 text-gray-700';
    }
  }, [job.job_type]);

  const handleEmailClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (job.contact_email) {
      window.location.href = `mailto:${job.contact_email}`;
    }
  }, [job.contact_email]);

  const handlePhoneClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (job.contact_phone) {
      window.location.href = `tel:${job.contact_phone.replace(/\D/g, '')}`;
    }
  }, [job.contact_phone]);

  return (
    <div 
      className="group bg-white rounded-xl shadow-lg border border-blue-200/50 overflow-hidden 
                hover:shadow-xl hover:border-blue-300 
                active:scale-[0.995] transition-all duration-200 
                focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      role="article"
      aria-label={`${job.title} at ${job.company_name}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 p-3 border-b border-blue-100">
        <div className="flex items-start gap-3">
          {/* Company Avatar */}
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg 
                          flex items-center justify-center shadow-md border-2 border-white overflow-hidden">
              {getCompanyAvatar()}
            </div>
            
            {/* Premium/Verified Badge */}
            {job.is_verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-green-500 to-emerald-500 
                            rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                <Award size={8} className="text-white" fill="white" />
              </div>
            )}
          </div>

          {/* Title and Salary */}
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-1">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">
                    {job.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <Building size={12} className="text-blue-500" />
                  <p className="text-blue-700 text-xs font-medium truncate">{job.company_name}</p>
                </div>
              </div>
              
              {/* Salary Display */}
              {job.salary && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white 
                              px-2 py-1 rounded-full text-xs font-bold shadow-sm 
                              border border-green-400/30 ml-2 flex-shrink-0">
                  {formatSalary(job.salary)}
                </div>
              )}
            </div>
            
            {/* Company Verified Status */}
            {job.company_verified && (
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle size={10} className="text-green-500" />
                <span className="text-xs text-green-600 font-medium">Verified Company</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Job Details */}
      <div className="p-3">
        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {/* Job Type */}
          <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-gray-50 to-gray-100/50 
                        rounded-lg border border-gray-200">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg 
                          flex items-center justify-center flex-shrink-0">
              <Briefcase size={14} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 font-medium">Job Type</div>
              <div className="font-semibold text-gray-900 text-xs truncate">{job.job_type}</div>
            </div>
          </div>

          {/* Location */}
          {job.location && (
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-gray-50 to-gray-100/50 
                          rounded-lg border border-gray-200">
              <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg 
                            flex items-center justify-center flex-shrink-0">
                <MapPin size={14} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 font-medium">Location</div>
                <div className="font-semibold text-gray-900 text-xs truncate">{job.location}</div>
              </div>
            </div>
          )}

          {/* Posted Date */}
          <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-gray-50 to-gray-100/50 
                        rounded-lg border border-gray-200">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg 
                          flex items-center justify-center flex-shrink-0">
              <Clock size={14} className="text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 font-medium">Posted</div>
              <div className="font-semibold text-gray-900 text-xs">{formatTimeAgo(job.created_at)}</div>
            </div>
          </div>

          {/* Views Count */}
          <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-gray-50 to-gray-100/50 
                        rounded-lg border border-gray-200">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg 
                          flex items-center justify-center flex-shrink-0">
              <Briefcase size={14} className="text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 font-medium">Views</div>
              <div className="font-semibold text-gray-900 text-xs">{job.views_count}</div>
            </div>
          </div>
        </div>

        {/* Description Preview */}
        {job.description && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1 font-medium">
              Job Description
            </div>
            <p className="text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100/50 
                        p-2 rounded-lg text-xs line-clamp-3 border border-gray-200">
              {job.description}
            </p>
          </div>
        )}

        {/* Contact Information */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 font-medium">
              Contact Information
            </div>
          </div>
          
          <div className="space-y-2">
            {/* Email Contact */}
            {job.contact_email && (
              <button
                onClick={handleEmailClick}
                className="w-full flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-blue-100/50 
                          rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-100 
                          active:scale-[0.98] transition-all duration-200 text-left min-h-[36px]"
                aria-label={`Send email to ${job.contact_email}`}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg 
                              flex items-center justify-center flex-shrink-0">
                  <Mail size={14} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 font-medium">Email</div>
                  <div className="text-blue-600 font-semibold text-xs truncate">{job.contact_email}</div>
                </div>
              </button>
            )}

            {/* Phone Contact */}
            {job.contact_phone && (
              <button
                onClick={handlePhoneClick}
                className="w-full flex items-center gap-2 p-2 bg-gradient-to-r from-green-50 to-green-100/50 
                          rounded-lg border border-green-200 hover:border-green-400 hover:bg-green-100 
                          active:scale-[0.98] transition-all duration-200 text-left min-h-[36px]"
                aria-label={`Call ${job.contact_phone}`}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg 
                              flex items-center justify-center flex-shrink-0">
                  <Phone size={14} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 font-medium">Phone</div>
                  <div className="text-green-600 font-semibold text-xs truncate">{job.contact_phone}</div>
                </div>
              </button>
            )}

            {/* Fallback message */}
            {!job.contact_email && !job.contact_phone && (
              <div className="text-center p-3 bg-gradient-to-r from-gray-50 to-gray-100/50 
                            rounded-lg border border-gray-200">
                <Mail size={18} className="text-gray-400 mx-auto mb-1" />
                <p className="text-gray-500 text-xs font-medium">Contact details not provided</p>
                <p className="text-gray-400 text-xs mt-0.5">Apply through platform</p>
              </div>
            )}
          </div>
        </div>

        {/* Apply Now Button */}
        {(job.contact_email || job.contact_phone) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white 
                        font-bold py-2 rounded-lg shadow-md hover:shadow-lg 
                        hover:from-blue-700 hover:to-indigo-700 
                        active:scale-[0.98] transition-all duration-200 
                        focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs min-h-[36px]"
              aria-label="Apply for this job"
            >
              Apply Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobCard;