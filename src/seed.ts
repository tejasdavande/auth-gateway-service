import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UserService } from './users/user.service';

async function seed() {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const config = app.get(ConfigService);

  const email = config.get<string>('SEED_ADMIN_EMAIL');
  const password = config.get<string>('SEED_ADMIN_PASSWORD');
  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set');
  }

  const admin = await app.get(UserService).ensureAdmin(email, password);
  logger.log(`admin ready: ${admin.email}`);

  await app.close();
}

seed().catch((error) => {
  new Logger('Seed').error(error);
  process.exit(1);
});
