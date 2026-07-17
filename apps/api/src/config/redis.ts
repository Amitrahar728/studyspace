import Redis from "ioredis";
import env from "./env";

// ioredis accepts TLS connection strings starting with rediss://
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on("connect", () => {
  console.log("Upstash Redis connected successfully.");
});

redis.on("error", (err) => {
  console.error("Upstash Redis connection error:", err);
});

export default redis;
