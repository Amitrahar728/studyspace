import * as jwt from "jsonwebtoken";
import env from "../config/env";
import { Role } from "@prisma/client";

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
}

export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET as jwt.Secret, {
    expiresIn: env.JWT_ACCESS_EXPIRY as any,
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET as jwt.Secret, {
    expiresIn: env.JWT_REFRESH_EXPIRY as any,
  });
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET as jwt.Secret) as JWTPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET as jwt.Secret) as { userId: string };
}
