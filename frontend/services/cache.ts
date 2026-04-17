import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'cache_';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export const cacheSet = async (key: string, data: any) => {
  try {
    const item = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
  } catch (e) {
    console.error('Cache set error:', e);
  }
};

export const cacheGet = async (key: string): Promise<any | null> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (Date.now() - item.timestamp > CACHE_TTL) {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return item.data;
  } catch (e) {
    return null;
  }
};

export const cachedFetch = async (api: any, url: string): Promise<any> => {
  try {
    const response = await api.get(url);
    await cacheSet(url, response.data);
    return response.data;
  } catch (error) {
    const cached = await cacheGet(url);
    if (cached) return cached;
    throw error;
  }
};
