import { formatDistanceToNow } from 'date-fns';

export const formatTimeAgo = (dateString: string) => {
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Some time ago';
    }
    
    // Handle UTC dates properly
    const now = new Date();
    const utcDate = new Date(date.toISOString());
    
    return formatDistanceToNow(utcDate, { 
      addSuffix: true,
      includeSeconds: true 
    });
  } catch {
    return 'Some time ago';
  }
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const extractHashtags = (text: string): string[] => {
  const hashtags = text.match(/#\w+/g);
  return hashtags ? hashtags.map(tag => tag.substring(1)) : [];
};

export function formatMessagePreview(content: string | null, maxLength: number = 40): string {
  if (!content) return 'No messages yet';
  
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}

// Format price
export function formatPrice(price: number | null): string {
  if (!price) return 'Price not set';
  return `$${price.toFixed(2)}`;
};