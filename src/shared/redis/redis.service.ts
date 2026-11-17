import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  async onModuleInit() {
    this.client = createClient({
      url: process.env.REDIS_URL,
    });
    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });

    await this.client.connect();
  }
  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.client.set(key, value, { EX: ttlSeconds });
      return;
    }
    await this.client.set(key, value);
  }
  async get(key: string) {
    return this.client.get(key);
  }
  async del(key: string) {
    return this.client.del(key);
  }

  async deleteByPattern(pattern: string) {
    let deleted = 0;

    for await (const keys of this.client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      if (keys.length > 0) {
        deleted += await this.client.del(keys);
      }
    }

    return deleted;
  }

  async incrementWithExpiry(key: string, ttlSeconds: number) {
    const value = await this.client.incr(key);
    if (value === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return value;
  }

  async expire(key: string, ttlSeconds: number) {
    return this.client.expire(key, ttlSeconds);
  }
}
