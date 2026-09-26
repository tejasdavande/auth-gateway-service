import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetTokens1790403300000 implements MigrationInterface {
  name = 'AddPasswordResetTokens1790403300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "tokenHash" character varying NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "usedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_password_reset_tokens_tokenHash" UNIQUE ("tokenHash"),
        CONSTRAINT "PK_password_reset_tokens_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_password_reset_tokens_userId" ON "password_reset_tokens" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_tokens_userId"`);
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
  }
}
