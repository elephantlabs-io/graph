"use strict";
// ---------------------------------------------------------------- //
// --------------------- 6. src/auth.ts --------------------------- //
// ---------------------------------------------------------------- //
// This file contains the authentication middleware.
// ---------------------------------------------------------------- //
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDataSourceClaim = exports.checkJwt = void 0;
const express_jwt_1 = require("express-jwt");
require("dotenv/config");
// Ensure the JWT_SECRET is set
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set.");
}
const secret = process.env.JWT_SECRET;
/**
 * Middleware to validate the JWT token.
 * It uses 'express-jwt' to handle the verification process.
 */
exports.checkJwt = (0, express_jwt_1.expressjwt)({
    secret: secret,
    algorithms: ['HS256'],
});
/**
 * Middleware to check if the USER_DATASOURCES claim exists in the token.
 * This runs *after* checkJwt has successfully validated the token.
 */
const checkDataSourceClaim = (req, res, next) => {
    if (!req.auth || !req.auth.USER_DATASOURCES) {
        return res.status(400).json({ message: "JWT token is missing the 'USER_DATASOURCES' claim." });
    }
    // If the claim exists, proceed to the next handler
    next();
};
exports.checkDataSourceClaim = checkDataSourceClaim;
