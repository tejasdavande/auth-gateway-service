import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository {
  constructor(@InjectRepository(RefreshToken) private readonly repo: Repository<RefreshToken>) {}

  async save(token: Partial<RefreshToken>): Promise<RefreshToken> {
    return await this.repo.save(token);
  }

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return await this.repo.findOne({ where: { tokenHash } });
  }

  async revoke(id: string): Promise<void> {
    await this.repo.update(id, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }
}
