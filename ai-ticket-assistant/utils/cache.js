import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

// Redis client instance
let redisClient = null;
let isConnected = false;

// TTL constants (in seconds)
export const CACHE_TTL = {
  MODERATOR_SKILLS: 3600,        // 1 hour - moderator skills change infrequently
  TICKET_STATS: 300,             // 5 minutes - stats need to be relatively fresh
  USER_SESSION: 86400,           // 24 hours - user session data
  RECENT_TICKETS: 180,           // 3 minutes - recent ticket lists
  TICKET_COUNTS: 60,             // 1 minute - ticket counts for dashboard
  MODERATOR_LIST: 1800,          // 30 minutes - list of moderators
};

/**
 * Initialize Redis connection
 */
export const initRedis = async () => {
  try {
    // Use environment variable or default to local Redis
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          // Reconnect with exponential backoff, max 3 seconds
          if (retries > 10) return new Error('Max retries reached');
          return Math.min(retries * 100, 3000);
        }
      }
    });

    // Event handlers
    redisClient.on('error', (err) => {
      isConnected = false;
      // Silently handle Redis errors - app continues without cache
    });

    redisClient.on('connect', () => {
      isConnected = true;
    });

    redisClient.on('ready', () => {
      isConnected = true;
    });

    redisClient.on('end', () => {
      isConnected = false;
    });

    // Connect to Redis
    await redisClient.connect();
    
    return true;
  } catch (error) {
    // Redis connection failed - app continues without cache
    isConnected = false;
    redisClient = null;
    return false;
  }
};

/**
 * Get Redis client (for direct operations if needed)
 */
export const getRedisClient = () => redisClient;

/**
 * Check if Redis is connected
 */
export const isRedisConnected = () => isConnected && redisClient?.isOpen;

/**
 * Cache-aside pattern: Get from cache or fetch from database
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch data if cache miss
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} - Cached or fresh data
 */
export const getOrSet = async (key, fetchFn, ttl = 300) => {
  try {
    // If Redis is not connected, skip cache and fetch directly
    if (!isRedisConnected()) {
      return await fetchFn();
    }

    // Try to get from cache
    const cached = await redisClient.get(key);
    
    if (cached) {
      // Cache hit
      return JSON.parse(cached);
    }

    // Cache miss - fetch from database
    const data = await fetchFn();
    
    // Store in cache with TTL (fire and forget)
    if (data !== null && data !== undefined) {
      redisClient.setEx(key, ttl, JSON.stringify(data)).catch(() => {
        // Silently fail cache write
      });
    }
    
    return data;
  } catch (error) {
    // On any error, fallback to fetching directly
    return await fetchFn();
  }
};

/**
 * Set a value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 */
export const set = async (key, value, ttl = 300) => {
  try {
    if (!isRedisConnected()) return false;
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Cached value or null
 */
export const get = async (key) => {
  try {
    if (!isRedisConnected()) return null;
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    return null;
  }
};

/**
 * Delete a key from cache
 * @param {string} key - Cache key
 */
export const del = async (key) => {
  try {
    if (!isRedisConnected()) return false;
    await redisClient.del(key);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Delete multiple keys matching a pattern
 * @param {string} pattern - Pattern to match (e.g., "tickets:*")
 */
export const delPattern = async (pattern) => {
  try {
    if (!isRedisConnected()) return false;
    
    const keys = [];
    for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keys.push(key);
    }
    
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Invalidate all cache entries for a specific resource type
 * @param {string} resource - Resource type (e.g., 'tickets', 'moderators')
 */
export const invalidateResource = async (resource) => {
  await delPattern(`${resource}:*`);
};

/**
 * Clear all cache
 */
export const clearCache = async () => {
  try {
    if (!isRedisConnected()) return false;
    await redisClient.flushDb();
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Close Redis connection
 */
export const closeRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      isConnected = false;
    }
  } catch (error) {
    // Ignore errors on close
  }
};

// Cache key generators
export const CACHE_KEYS = {
  moderatorSkills: (moderatorId) => `moderator:${moderatorId}:skills`,
  allModerators: () => 'moderators:all',
  moderatorsWithSkills: () => 'moderators:with-skills',
  ticketStats: (userId, role) => `stats:tickets:${role}:${userId}`,
  ticketList: (status, page = 1) => `tickets:list:${status}:page:${page}`,
  recentTickets: (limit = 10) => `tickets:recent:${limit}`,
  ticketCounts: (userId, role) => `counts:tickets:${role}:${userId}`,
  userSession: (userId) => `session:${userId}`,
};

export default {
  initRedis,
  getRedisClient,
  isRedisConnected,
  getOrSet,
  set,
  get,
  del,
  delPattern,
  invalidateResource,
  clearCache,
  closeRedis,
  CACHE_TTL,
  CACHE_KEYS,
};
