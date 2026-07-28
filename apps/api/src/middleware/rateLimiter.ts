import { Request, Response, NextFunction } from "express";
import redis from "../config/redis";

export function authRateLimiter(maxRequests: number = 10, windowSeconds: number = 900) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
      const key = `ratelimit:auth:${String(ip)}`;

      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (current > maxRequests) {
        const ttl = await redis.ttl(key);
        const minutesLeft = Math.ceil(ttl / 60);
        return res.status(429).json({
          message: `Too many login attempts. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""}.`,
        });
      }

      return next();
    } catch (error) {
      // If Redis fails, allow request to proceed so auth isn't blocked completely
      console.error("Rate limiter error:", error);
      return next();
    }
  };
}
