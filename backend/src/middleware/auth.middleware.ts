import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User, Role, IUser } from "../models/index.js";
import { HttpError } from "../utils/httpError.js";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Kept for backwards compatibility with existing imports. */
export type AuthRequest = Request;

interface TokenPayload extends jwt.JwtPayload {
  id: string;
  tv?: number;
}

export const signToken = (user: Pick<IUser, "id" | "username" | "email" | "role"> & { tokenVersion?: number }): string =>
  jwt.sign({ id: user.id, username: user.username, email: user.email, role: user.role, tv: user.tokenVersion ?? 0 }, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });

const extractBearer = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
};

/**
 * Verifies the JWT and re-loads the user from the database so that deleted
 * (banned) users, role changes and password resets take effect immediately.
 */
const resolveUser = async (token: string): Promise<AuthUser | null> => {
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload;
  } catch {
    return null;
  }
  if (!payload?.id) return null;

  const user = await User.findOne({ id: payload.id }, { id: 1, username: 1, email: 1, role: 1, tokenVersion: 1 }).lean();
  if (!user) return null;

  if ((payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
    return null; // revoked, e.g. by a password reset
  }
  return { id: user.id, username: user.username, email: user.email, role: user.role };
};

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearer(req);
  if (!token) return next(HttpError.unauthorized("Access token is missing"));
  const user = await resolveUser(token);
  if (!user) return next(HttpError.unauthorized("Token is invalid or expired"));
  req.user = user;
  next();
};

/** Attaches req.user when a valid token is present; never rejects the request. */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearer(req);
  if (token) {
    const user = await resolveUser(token);
    if (user) req.user = user;
  }
  next();
};

export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") {
    return next(HttpError.forbidden("Access denied. Only shadows of high authority (admins) can pass."));
  }
  next();
};

/** Backwards-compatible alias. */
export const authenticateToken = authenticate;

/** Narrowing helper for handlers mounted behind `authenticate`. */
export const currentUser = (req: Request): AuthUser => {
  if (!req.user) throw HttpError.unauthorized();
  return req.user;
};
