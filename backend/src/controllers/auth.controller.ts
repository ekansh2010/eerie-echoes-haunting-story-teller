import { Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, IUser } from "../database/mongoDb";
import { AuthRequest } from "../middleware/auth.middleware";

const JWT_SECRET = process.env.JWT_SECRET || "haunting_eerie_echoes_secret_key_666";

const generateToken = (user: IUser) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // Check if email already exists
    const existingEmail = await User.findOne({ email: new RegExp(`^${email}$`, "i") });
    if (existingEmail) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: new RegExp(`^${username}$`, "i") });
    if (existingUsername) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      id: `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username,
      email,
      passwordHash,
      avatar: "",
      role: "user",
      createdAt: new Date().toISOString().split("T")[0]
    });

    await newUser.save();

    const token = generateToken(newUser);
    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      avatar: newUser.avatar,
      role: newUser.role,
      createdAt: newUser.createdAt,
      isVerified: newUser.isVerified
    };

    return res.status(201).json({
      token,
      user: userResponse
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: new RegExp(`^${email}$`, "i") });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = generateToken(user);
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
      isVerified: user.isVerified
    };

    return res.json({
      token,
      user: userResponse
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findOne({ id: req.user?.id });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
      isVerified: user.isVerified
    };

    return res.json(userResponse);
  } catch (error) {
    console.error("Auth me error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const verifyEmail = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findOneAndUpdate(
      { id: req.user?.id },
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify email error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const resetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { email, newPassword } = req.body;

    // In a real application, you would generate a token, email it, 
    // and verify the token here. For MVP purposes, we look up the user.
    const user = await User.findOne({ email: new RegExp(`^${email}$`, "i") });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    user.passwordHash = passwordHash;
    await user.save();

    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
