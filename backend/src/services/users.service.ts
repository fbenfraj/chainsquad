import User from "../models/user.model";
import { UpdateUserValidationSchema } from "../validations/user.validation";
import { IdSchema } from "../validations/general.validation";
import squadsService from "./squads.service";
import { SanitizedUser, UserUpdateParams } from "../types";

class UserService {
  async getUserById(userId: number): Promise<Partial<User>> {
    try {
      const id = IdSchema.parse(userId);
      const user = await User.findByPk(id);

      if (!user) {
        throw new Error("User not found");
      }

      const squads = await squadsService.getSquadsByUser(id);

      return {
        ...this.sanitizeUser(user),
        squads,
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<Partial<User>> {
    try {
      const user = await User.findOne({ where: { username: username } });

      if (!user) {
        throw new Error("User not found");
      }

      const squads = await squadsService.getSquadsByUser(user.userId);

      return {
        ...this.sanitizeUser(user),
        squads,
      };
    } catch (error) {
      throw error;
    }
  }

  async getAllUsers(): Promise<Partial<User>[]> {
    try {
      const users = await User.findAll();

      if (!users) {
        throw new Error("No users found");
      }

      return users.map((user) => this.sanitizeUser(user));
    } catch (error) {
      throw error;
    }
  }

  async updateUser(
    userId: number,
    updates: UserUpdateParams
  ): Promise<Partial<User> | null> {
    try {
      UpdateUserValidationSchema.parse({
        userId,
        ...updates,
      });

      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (updates.username) {
        user.username = updates.username;
      }

      if (updates.email) {
        user.email = updates.email;
      }

      if (updates.walletAddress) {
        user.walletAddress = updates.walletAddress;
      }

      await user.save?.();

      return user;
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(userId: number): Promise<void> {
    try {
      const id = IdSchema.parse(userId);
      const user = await this.getUserById(id);

      if (!user) {
        throw new Error("User not found");
      }

      await user.destroy?.();
    } catch (error) {
      throw error;
    }
  }

  sanitizeUser(user: User | Record<string, any>): SanitizedUser {
    const userPlainObject = typeof user.get === "function" ? user.get() : user;
    const sanitizedUser = { ...userPlainObject };

    delete sanitizedUser.passwordHash;

    return sanitizedUser as SanitizedUser;
  }
}

export default new UserService();
