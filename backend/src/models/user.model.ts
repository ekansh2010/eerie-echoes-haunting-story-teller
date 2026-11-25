import mongoose, { Schema, Model } from "mongoose";

export type Role = "user" | "admin";

export interface IUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  avatar: string;
  role: Role;
  createdAt: string;
  isVerified: boolean;
  /** SHA-256 of the emailed verification token (raw token is never stored). */
  verificationToken?: string;
  verificationExpires?: Date;
  /** SHA-256 of the emailed reset token (raw token is never stored). */
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  /** Embedded in JWTs; incrementing it revokes every previously issued token. */
  tokenVersion: number;
}

const UserSchema = new Schema<IUser>(
  {
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true, trim: true, maxlength: 30 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    createdAt: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, index: true, sparse: true },
    verificationExpires: { type: Date },
    resetPasswordToken: { type: String, index: true, sparse: true },
    resetPasswordExpires: { type: Date },
    tokenVersion: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
