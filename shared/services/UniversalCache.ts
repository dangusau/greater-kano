// src/shared/services/UniversalCache.ts
export class UniversalCache {
  private namespace: string;

  constructor(namespace: string = 'app_cache') {
    this.namespace = namespace;
  }

  async set<T>(key: string, data: T, ttl: number = 15 * 60 * 1000): Promise<void> {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(`${this.namespace}:${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn('Cache set failed:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const itemStr = localStorage.getItem(`${this.namespace}:${key}`);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);
      if (Date.now() - item.timestamp > item.ttl) {
        localStorage.removeItem(`${this.namespace}:${key}`);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('Cache get failed:', error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(`${this.namespace}:${key}`);
    } catch (error) {
      console.warn('Cache remove failed:', error);
    }
  }

  async removePattern(pattern: string): Promise<void> {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`${this.namespace}:${pattern}`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Cache removePattern failed:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`${this.namespace}:`)) keysToRemove.push(key);
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
  }
}

export const appCache = new UniversalCache();
