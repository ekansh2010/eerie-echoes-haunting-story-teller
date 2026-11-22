import mongoose, { Schema, Model } from "mongoose";

// --- Comments ---
export interface IComment {
  id: string;
  storyId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

const CommentSchema = new Schema<IComment>(
  {
    id: { type: String, required: true, unique: true },
    storyId: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    username: { type: String, required: true },
    text: { type: String, required: true, maxlength: 2000 },
    createdAt: { type: String, required: true },
  },
  { versionKey: false },
);
CommentSchema.index({ storyId: 1, createdAt: -1 });

export const Comment: Model<IComment> = mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema);

// --- Likes ---
export interface ILike {
  userId: string;
  storyId: string;
}

const LikeSchema = new Schema<ILike>(
  {
    userId: { type: String, required: true },
    storyId: { type: String, required: true, index: true },
  },
  { versionKey: false },
);
// One like per user per story — enforced by the database, not just app logic.
LikeSchema.index({ userId: 1, storyId: 1 }, { unique: true });

export const Like: Model<ILike> = mongoose.models.Like || mongoose.model<ILike>("Like", LikeSchema);

// --- Adoption applications ---
export const APPLICATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface IApplication {
  id: string;
  userId: string;
  username: string;
  storyId: string;
  storyTitle: string;
  notes: string;
  status: ApplicationStatus;
  createdAt: string;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    username: { type: String, required: true },
    storyId: { type: String, required: true, index: true },
    storyTitle: { type: String, required: true },
    notes: { type: String, default: "", maxlength: 2000 },
    status: { type: String, enum: APPLICATION_STATUSES, default: "pending" },
    createdAt: { type: String, required: true },
  },
  { versionKey: false },
);
ApplicationSchema.index({ userId: 1, storyId: 1 });

export const Application: Model<IApplication> =
  mongoose.models.Application || mongoose.model<IApplication>("Application", ApplicationSchema);

// --- Contact submissions ---
export interface IContactSubmission {
  id: string;
  userId?: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

const ContactSubmissionSchema = new Schema<IContactSubmission>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String },
    name: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, maxlength: 254 },
    message: { type: String, required: true, maxlength: 5000 },
    createdAt: { type: String, required: true },
  },
  { versionKey: false },
);

export const ContactSubmission: Model<IContactSubmission> =
  mongoose.models.ContactSubmission || mongoose.model<IContactSubmission>("ContactSubmission", ContactSubmissionSchema);

// --- Audio tracks ---
export interface IAudioTrack {
  id: string;
  title: string;
  url: string;
  duration?: string;
  credit?: string;
}

const AudioTrackSchema = new Schema<IAudioTrack>(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    duration: { type: String },
    credit: { type: String },
  },
  { versionKey: false },
);

export const AudioTrack: Model<IAudioTrack> =
  mongoose.models.AudioTrack || mongoose.model<IAudioTrack>("AudioTrack", AudioTrackSchema);

// --- Uploaded images (stored in MongoDB so it works on read-only/serverless hosts) ---
export interface IUpload {
  id: string;
  ownerId: string;
  contentType: string;
  size: number;
  data: Buffer;
  createdAt: Date;
}

const UploadSchema = new Schema<IUpload>(
  {
    id: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true, index: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

export const Upload: Model<IUpload> = mongoose.models.Upload || mongoose.model<IUpload>("Upload", UploadSchema);
