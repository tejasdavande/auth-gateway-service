import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/role.enum';
import { User } from './entities/user.entity';
import { UserRepository } from './user.repository';

const SALT_ROUNDS = 12;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

@Injectable()
export class UserService {
  constructor(private readonly users: UserRepository) {}

  async getById(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('user not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.users.findByEmail(email);
  }

  async findById(id: string): Promise<User | null> {
    return await this.users.findById(id);
  }

  async list(page: number, limit: number): Promise<[User[], number]> {
    return await this.users.findPage((page - 1) * limit, limit);
  }

  async register(email: string, password: string): Promise<User> {
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new ConflictException('email already registered');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    return await this.users.save({ email, passwordHash, role: Role.MEMBER });
  }

  async ensureAdmin(email: string, password: string): Promise<User> {
    const existing = await this.users.findByEmail(email);
    if (existing) {
      return existing.role === Role.ADMIN
        ? existing
        : await this.users.save({ id: existing.id, role: Role.ADMIN });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    return await this.users.save({ email, passwordHash, role: Role.ADMIN });
  }

  async validateCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.users.findByEmail(email);
    if (!user || this.isLocked(user)) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      await this.recordFailedLogin(user.id);
      return null;
    }

    return user;
  }

  async recordFailedLogin(userId: string): Promise<void> {
    const attempts = await this.users.incrementFailedLogins(userId);
    if (attempts >= MAX_FAILED_LOGINS) {
      await this.users.save({
        id: userId,
        failedLoginAttempts: 0,
        lockedUntil: new Date(Date.now() + LOCKOUT_MS),
      });
    }
  }

  async clearFailedLogins(user: User): Promise<void> {
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.users.save({ id: user.id, failedLoginAttempts: 0, lockedUntil: null });
    }
  }

  async updatePassword(userId: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.users.save({ id: userId, passwordHash, failedLoginAttempts: 0, lockedUntil: null });
  }

  async setTotpSecret(userId: string, secret: string): Promise<void> {
    await this.users.save({ id: userId, totpSecret: secret });
  }

  async enableTotp(userId: string): Promise<void> {
    await this.users.save({ id: userId, totpEnabled: true });
  }

  private isLocked(user: User): boolean {
    return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
  }
}
