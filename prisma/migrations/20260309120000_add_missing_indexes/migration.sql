-- CreateIndex
CREATE INDEX "financial_goals_profileId_deadline_idx" ON "financial_goals"("profileId", "deadline");

-- CreateIndex
CREATE INDEX "purchase_decisions_profileId_date_idx" ON "purchase_decisions"("profileId", "date");
