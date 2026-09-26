import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PasswordResetToken } from './entities/password-reset-token.entity';

@Injectable()
export class PasswordResetTokenRepository {
  constructor(@InjectRepository(PasswordResetToken) private readonly repo: Repository<PasswordResetToken>) {}

  async save(token: Partial<PasswordResetToken>): Promise<PasswordResetToken> {
    return await this.repo.save(token);
  }

  async findByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return await this.repo.findOne({ where: { tokenHash } });
  }

  async markUsed(id: string): Promise<boolean> {
    const result = await this.repo.update({ id, usedAt: IsNull() }, { usedAt: new Date() });
    return result.affected === 1;
  }

  async invalidateOpenForUser(userId: string): Promise<void> {
    await this.repo.update({ userId, usedAt: IsNull() }, { usedAt: new Date() });
  }
}
