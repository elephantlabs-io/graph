// ---------------------------------------------------------------- //
// --------------------- 6. src/auth.ts --------------------------- //
// ---------------------------------------------------------------- //
// This file contains the authentication middleware.
// ---------------------------------------------------------------- //

import { Request, Response, NextFunction } from 'express';
import { expressjwt, GetVerificationKey } from 'express-jwt';
import 'dotenv/config';

// Ensure the JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set.");
}

const secret = process.env.JWT_SECRET;

// Define a custom type for our JWT payload
export interface AppJWTPayload {
  USER_DATASOURCES: string; // e.g., "DS1,DS2,DS3"
  iat: number;
  exp: number;
}

// Extend the Express Request type to include our authenticated user payload
declare global {
  namespace Express {
    export interface Request {
      auth?: AppJWTPayload;
    }
  }
}

/**
 * Middleware to validate the JWT token.
 * It uses 'express-jwt' to handle the verification process.
 */
export const checkJwt = expressjwt({
  secret: secret as GetVerificationKey,
  algorithms: ['HS256'],
});

/**
 * Middleware to check if the USER_DATASOURCES claim exists in the token.
 * This runs *after* checkJwt has successfully validated the token.
 */
export const checkDataSourceClaim = (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !req.auth.USER_DATASOURCES) {
        return res.status(400).json({ message: "JWT token is missing the 'USER_DATASOURCES' claim." });
    }
    // If the claim exists, proceed to the next handler
    next();
};
