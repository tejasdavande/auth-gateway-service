import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  async findById(id: string): Promise<User | null> {
    return await this.repo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.repo.findOne({ where: { email } });
  }

  async findPage(skip: number, take: number): Promise<[User[], number]> {
    return await this.repo.findAndCount({ order: { createdAt: 'ASC' }, skip, take });
  }

  async incrementFailedLogins(id: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(User)
      .set({ failedLoginAttempts: () => '"failedLoginAttempts" + 1' })
      .where('id = :id', { id })
      .returning('"failedLoginAttempts"')
      .execute();

    return result.raw[0].failedLoginAttempts;
  }

  async save(user: Partial<User>): Promise<User> {
    return await this.repo.save(user);
  }
}
