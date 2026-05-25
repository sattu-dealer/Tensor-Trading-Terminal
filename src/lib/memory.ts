import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';

// Local Fallback Path for localhost development
const LOCAL_MEMORY_FILE = path.join(process.cwd(), 'data', 'memory.json');

// Ensure data dir exists locally
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
    try { fs.mkdirSync(path.join(process.cwd(), 'data')); } catch (e) {}
}

const getRedisClient = () => {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        return new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }
    return null;
};

export async function setMemoryKey(key: string, value: any) {
    const redis = getRedisClient();
    if (redis) {
        await redis.set(key, value);
        return;
    }

    // Local fallback
    try {
        let memory: any = {};
        if (fs.existsSync(LOCAL_MEMORY_FILE)) {
            memory = JSON.parse(fs.readFileSync(LOCAL_MEMORY_FILE, 'utf-8'));
        }
        memory[key] = value;
        fs.writeFileSync(LOCAL_MEMORY_FILE, JSON.stringify(memory, null, 2));
    } catch (err) {
        console.error("Local fallback write failed:", err);
    }
}

export async function getMemoryKey(key: string) {
    const redis = getRedisClient();
    if (redis) {
        return await redis.get(key);
    }

    // Local fallback
    try {
        if (fs.existsSync(LOCAL_MEMORY_FILE)) {
            const memory = JSON.parse(fs.readFileSync(LOCAL_MEMORY_FILE, 'utf-8'));
            return memory[key] || null;
        }
    } catch (err) {
        console.error("Local fallback read failed:", err);
    }
    return null;
}
