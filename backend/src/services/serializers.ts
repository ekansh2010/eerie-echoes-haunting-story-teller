import { IUser } from "../models";

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  avatar: string;
  role: IUser["role"];
  createdAt: string;
  isVerified: boolean;
}

/** The only user shape that ever leaves the API — never includes hashes or tokens. */
export const toPublicUser = (u: Pick<IUser, keyof PublicUser>): PublicUser => ({
  id: u.id,
  username: u.username,
  email: u.email,
  avatar: u.avatar ?? "",
  role: u.role,
  createdAt: u.createdAt,
  isVerified: !!u.isVerified,
});

/** Strips Mongo internals (`_id`, `__v`) from a lean document. */
export const stripInternal = <T extends object>(doc: T): Omit<T, "_id" | "__v"> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, __v, ...rest } = doc as T & { _id?: unknown; __v?: unknown };
  return rest;
};
