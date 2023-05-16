import User from "../models/user.model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import sequelize from "sequelize";
import { UserValidationSchema } from "../validations/user.validation";
import { z } from "zod";
import {
  RefreshTokenValidationSchema,
  SignInValidationSchema,
} from "../validations/authentication.validation";
import { formatAndThrowZodError } from "../utils/validation";

dotenv.config();

const secretKey = process.env.JWT_SECRET || "";
const expiresIn = "15min";
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (!secretKey || !refreshSecret) {
  throw new Error(
    "JWT_SECRET or JWT_REFRESH_SECRET is not defined in .env file"
  );
}

class AuthenticationService {
  async signUp(
    username: string,
    fullName: string,
    email: string,
    password: string
  ): Promise<User> {
    try {
      UserValidationSchema.parse({
        username,
        fullName,
        email,
        password,
      });

      const passwordHash = await bcrypt.hash(password, 10);

      const user = new User({
        Username: username,
        FullName: fullName,
        Email: email,
        PasswordHash: passwordHash,
      });

      await user.save();

      return user;
    } catch (error) {
      if (error instanceof sequelize.UniqueConstraintError) {
        throw new Error("Username or email already exists");
      }
      if (error instanceof z.ZodError) {
        formatAndThrowZodError(error);
      }
      throw error;
    }
  }

  async signIn(
    username: string,
    password: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      SignInValidationSchema.parse({
        username,
        password,
      });

      const user = await User.findOne({ where: { Username: username } });

      if (!user) {
        throw new Error("No such user found");
      }

      const valid = await bcrypt.compare(password, user.PasswordHash || "");

      if (!valid) {
        throw new Error("Invalid password");
      }

      const accessToken = jwt.sign({ UserID: user.UserID }, secretKey, {
        expiresIn,
      });
      const refreshToken = this.generateRefreshToken(user.UserID);

      return { accessToken, refreshToken };
    } catch (error) {
      if (error instanceof z.ZodError) {
        formatAndThrowZodError(error);
      }
      throw error;
    }
  }

  generateRefreshToken(userId: number): string {
    const refreshToken = jwt.sign({ UserID: userId }, refreshSecret as string, {
      expiresIn: "7d", // 1 week
    });

    return refreshToken;
  }

  refreshAccessToken(refreshToken: string): string {
    let userId;

    try {
      RefreshTokenValidationSchema.parse({
        refreshToken,
      });

      const decoded = jwt.verify(refreshToken, refreshSecret as string);
      userId = (decoded as any).UserID;
    } catch (error) {
      if (error instanceof z.ZodError) {
        formatAndThrowZodError(error);
      }

      throw new Error("Invalid refresh token");
    }

    const accessToken = jwt.sign({ UserID: userId }, secretKey, { expiresIn });

    return accessToken;
  }
}

export default new AuthenticationService();