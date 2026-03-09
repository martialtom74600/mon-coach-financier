-- CreateEnum
CREATE TYPE "DecisionOutcome" AS ENUM ('SATISFIED', 'REGRETTED');

-- AlterTable
ALTER TABLE "purchase_decisions" ADD COLUMN "outcome" "DecisionOutcome";
