import User from "../models/user.model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import sequelize from "sequelize";
import { UserValidationSchema } from "../validations/user.validation";
import {
  RefreshTokenValidationSchema,
  SignInValidationSchema,
} from "../validations/authentication.validation";
import usersService from "./users.service";

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
    email: string,
    password: string
  ): Promise<{
    user: Partial<User>;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      UserValidationSchema.parse({
        username,
        email,
        password,
      });

      const passwordHash = await bcrypt.hash(password, 10);

      const user = new User({
        username: username.toLowerCase(),
        displayName: username,
        email,
        passwordHash,
      });

      await user.save();

      const { accessToken, refreshToken } = this.generateTokens(user.userId);
      const sanitizedUser = usersService.sanitizeUser(user);

      return { user: sanitizedUser, accessToken, refreshToken };
    } catch (error) {
      if (error instanceof sequelize.UniqueConstraintError) {
        throw new Error("Username or email already exists");
      }
      throw error;
    }
  }

  async signIn(
    username: string,
    password: string
  ): Promise<{
    user: Partial<User>;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const { username: validUsername, password: validPassword } =
        SignInValidationSchema.parse({
          username,
          password,
        });

      const normalizedUsername = validUsername.toLowerCase();

      const user = await User.findOne({
        where: { username: normalizedUsername },
      });

      if (!user) {
        throw new Error("Invalid credentials");
      }

      const valid = await bcrypt.compare(
        validPassword,
        user.passwordHash || ""
      );

      if (!valid) {
        throw new Error("Invalid credentials");
      }

      const { accessToken, refreshToken } = this.generateTokens(user.userId);
      const sanitizedUser = usersService.sanitizeUser(user);

      return { user: sanitizedUser, accessToken, refreshToken };
    } catch (error) {
      throw error;
    }
  }

  generateTokens(userId: number): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = jwt.sign({ userId }, secretKey, {
      expiresIn,
    });
    const refreshToken = this.generateRefreshToken(userId);

    return { accessToken, refreshToken };
  }

  generateRefreshToken(userId: number): string {
    const refreshToken = jwt.sign({ userId }, refreshSecret as string, {
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
      userId = (decoded as any).userId;
    } catch (error) {
      throw new Error("Invalid refresh token");
    }

    const accessToken = jwt.sign({ userId }, secretKey, { expiresIn });

    return accessToken;
  }
}

export default new AuthenticationService();
