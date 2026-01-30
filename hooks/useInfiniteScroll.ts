import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollProps {
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  threshold?: number;
}

export const useInfiniteScroll = ({
  hasMore,
  loadingMore,
  onLoadMore,
  threshold = 0.1
}: UseInfiniteScrollProps) => {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          onLoadMore();
        }
      },
      { threshold }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loadingMore, onLoadMore, threshold]);

  return { observerTarget };
};