// src/utils/performanceHelpers.ts
import { useRef, useCallback } from 'react';

/**
 * Throttle function to limit how often a function can be called
 * @param func - Function to throttle
 * @param delay - Delay in milliseconds
 * @returns Throttled function
 */
export const throttle = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  let lastExecTime = 0;
  
  return function (...args: any[]) {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay);
    }
  };
};

/**
 * Debounce function to delay execution until after delay has passed
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  
  return function (...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Hook to create a throttled callback
 * @param callback - Callback function to throttle
 * @param delay - Throttle delay in milliseconds
 * @param deps - Dependencies array
 * @returns Throttled callback
 */
export const useThrottledCallback = (callback: Function, delay: number, deps: any[] = []) => {
  const throttledCallback = useRef(throttle(callback, delay));
  
  return useCallback(throttledCallback.current, deps);
};

/**
 * Hook to create a debounced callback
 * @param callback - Callback function to debounce
 * @param delay - Debounce delay in milliseconds
 * @param deps - Dependencies array
 * @returns Debounced callback
 */
export const useDebouncedCallback = (callback: Function, delay: number, deps: any[] = []) => {
  const debouncedCallback = useRef(debounce(callback, delay));
  
  return useCallback(debouncedCallback.current, deps);
};

/**
 * Memoization utility for expensive calculations
 */
export class MemoCache {
  private cache = new Map();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(key: string) {
    return this.cache.get(key);
  }

  set(key: string, value: any) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: string) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Utility to batch multiple state updates
 */
export const batchUpdates = (updates: (() => void)[]) => {
  // React automatically batches updates in event handlers
  // This is more for explicit batching when needed
  updates.forEach(update => update());
};

/**
 * Helper to format coordinates with memoization
 */
const coordsCache = new MemoCache(50);

export const formatCoordinatesCached = (lat: number | null, lng: number | null): string => {
  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
    return 'Unknown Location';
  }

  const key = `${lat}-${lng}`;
  if (coordsCache.has(key)) {
    return coordsCache.get(key);
  }

  const formatted = `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  coordsCache.set(key, formatted);
  return formatted;
};

/**
 * Helper to get street name with memoization
 */
const streetNameCache = new MemoCache(100);

export const getStreetNameCached = (item: any): string => {
  const key = `${item.id}-${item.streetName}-${item.lat}-${item.lng}`;
  
  if (streetNameCache.has(key)) {
    return streetNameCache.get(key);
  }

  let result: string;

  if (item.streetName &&
      item.streetName.trim() !== '' &&
      !item.streetName.includes('null') &&
      !item.streetName.includes('undefined')) {
    result = item.streetName;
  } else if (item.lat !== null && item.lng !== null) {
    result = formatCoordinatesCached(item.lat, item.lng);
  } else {
    result = `Incident #${item.id}`;
  }

  streetNameCache.set(key, result);
  return result;
};