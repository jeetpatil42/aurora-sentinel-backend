import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const accessSecret = process.env.JWT_ACCESS_SECRET || 'default-access-secret';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
const accessExpiry: SignOptions['expiresIn'] = (process.env.JWT_ACCESS_EXPIRY || '15m') as SignOptions['expiresIn'];
const refreshExpiry: SignOptions['expiresIn'] = (process.env.JWT_REFRESH_EXPIRY || '7d') as SignOptions['expiresIn'];

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, accessSecret, {
    expiresIn: accessExpiry,
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, refreshSecret, {
    expiresIn: refreshExpiry,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, accessSecret) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, refreshSecret) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}
