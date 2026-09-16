import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/role.enum';
import { User } from './entities/user.entity';
import { UserRepository } from './user.repository';

const SALT_ROUNDS = 12;

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

  async register(email: string, password: string): Promise<User> {
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new ConflictException('email already registered');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    return await this.users.save({ email, passwordHash, role: Role.MEMBER });
  }

  async validateCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    return passwordMatches ? user : null;
  }

  async setTotpSecret(userId: string, secret: string): Promise<void> {
    await this.users.save({ id: userId, totpSecret: secret });
  }

  async enableTotp(userId: string): Promise<void> {
    await this.users.save({ id: userId, totpEnabled: true });
  }
}
