import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/index.js";
import { currentUser, signToken } from "../middleware/auth.middleware.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../services/email.service.js";
import { toPublicUser } from "../services/serializers.js";
import { HttpError } from "../utils/httpError.js";
import { BCRYPT_ROUNDS, CASE_INSENSITIVE, generateId, generateToken, hashToken, today } from "../utils/helpers.js";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const RESET_MESSAGE = "If that email exists in our records, a reset password link has been sent.";

// Pre-computed hash used to equalise timing when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_ROUNDS);

const findByEmail = (email: string) => User.findOne({ email }).collation(CASE_INSENSITIVE);

export const register = async (req: Request, res: Response) => {
  const { username, email, password } = req.body as { username: string; email: string; password: string };

  if (await User.exists({ email }).collation(CASE_INSENSITIVE)) {
    throw HttpError.conflict("Email is already registered");
  }
  if (await User.exists({ username }).collation(CASE_INSENSITIVE)) {
    throw HttpError.conflict("Username is already taken");
  }

  const verificationToken = generateToken();
  const user = await User.create({
    id: generateId("u"),
    username,
    email,
    passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    avatar: "",
    role: "user",
    createdAt: today(),
    isVerified: false,
    verificationToken: hashToken(verificationToken),
    verificationExpires: new Date(Date.now() + VERIFY_TTL_MS),
  });

  // Awaited (not fire-and-forget) so it completes on serverless platforms; never throws.
  await sendVerificationEmail(user.email, verificationToken);

  res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await findByEmail(email);

  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw HttpError.unauthorized("Invalid email or password");

  res.json({ token: signToken(user), user: toPublicUser(user) });
};

export const me = async (req: Request, res: Response) => {
  const user = await User.findOne({ id: currentUser(req).id }).lean();
  if (!user) throw HttpError.notFound("User not found");
  res.json(toPublicUser(user));
};

/**
 * POST /api/auth/verify — (re)sends the verification email to the logged-in
 * user. Verification itself only happens via the emailed token.
 */
export const resendVerification = async (req: Request, res: Response) => {
  const user = await User.findOne({ id: currentUser(req).id });
  if (!user) throw HttpError.notFound("User not found");
  if (user.isVerified) {
    return res.json({ message: "Your email is already verified.", isVerified: true });
  }

  const token = generateToken();
  user.verificationToken = hashToken(token);
  user.verificationExpires = new Date(Date.now() + VERIFY_TTL_MS);
  await user.save();
  await sendVerificationEmail(user.email, token);

  res.json({ message: "A verification link has been sent to your email.", isVerified: false });
};

export const verifyEmailToken = async (req: Request, res: Response) => {
  const { token } = req.body as { token: string };
  const user = await User.findOneAndUpdate(
    { verificationToken: hashToken(token), verificationExpires: { $gt: new Date() } },
    { $set: { isVerified: true }, $unset: { verificationToken: "", verificationExpires: "" } },
    { returnDocument: "after" },
  ).lean();
  if (!user) throw HttpError.badRequest("Verification link is invalid or has expired.");

  res.json({ message: "Email verified successfully!", user: toPublicUser(user) });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  const user = await findByEmail(email);

  if (user) {
    const token = generateToken();
    user.resetPasswordToken = hashToken(token);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TTL_MS);
    await user.save();
    await sendPasswordResetEmail(user.email, token);
  }
  // Identical response either way to prevent account enumeration.
  res.json({ message: RESET_MESSAGE });
};

export const resetPasswordConfirm = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as { token: string; newPassword: string };
  const user = await User.findOne({
    resetPasswordToken: hashToken(token),
    resetPasswordExpires: { $gt: new Date() },
  });
  if (!user) throw HttpError.badRequest("Password reset link is invalid or has expired.");

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1; // log out every existing session
  await user.save();

  res.json({ message: "Password updated successfully! Please log in again." });
};

export const updateAvatar = async (req: Request, res: Response) => {
  const { avatar } = req.body as { avatar: string };
  const user = await User.findOneAndUpdate({ id: currentUser(req).id }, { avatar }, { returnDocument: "after" }).lean();
  if (!user) throw HttpError.notFound("User not found");
  res.json(toPublicUser(user));
};
