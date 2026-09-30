import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogs1790760000000 implements MigrationInterface {
  name = 'AddAuditLogs1790760000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event" character varying NOT NULL,
        "userId" character varying,
        "ip" character varying,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_userId" ON "audit_logs" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_createdAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_userId"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
