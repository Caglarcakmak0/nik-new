// Magic string & defaults centralization for Exam Tracker
export const DEFAULT_FREQUENT_LIMIT = 15;
export const DEFAULT_FREQUENT_RANGE = '30d';
export const DEFAULT_TOPIC_HISTORY_RANGE = '60d';
export const DEFAULT_AGGREGATE_RANGE = '30d';
export const VALID_RANGES = ['7d','30d','60d','90d','all'] as const;
export type RangeParam = typeof VALID_RANGES[number];

export const AGGREGATE_BUCKETS = ['day','week','month'] as const;
export type AggregateBucket = typeof AGGREGATE_BUCKETS[number];

export const CACHE_KEYS = {
  topicHistory: (topic:string, range:RangeParam) => `topicHistory|${topic}|${range}`,
  aggregateHistory: (type:'TYT'|'AYT', bucket:AggregateBucket, range:RangeParam) => `aggregateHistory|${type}|${bucket}|${range}`,
  frequentTopics: (limit:number, period:string) => `frequent|${limit}|${period}`
};

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (soft)

export interface CacheEntry<T> { data:T; ts:number; }
