-- CreateEnum
CREATE TYPE "AdminRequestType" AS ENUM ('TRANSFER_ADMIN', 'REQUEST_ADMIN_ACCESS');

-- CreateEnum
CREATE TYPE "AdminRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EXPENSE_SUBMITTED', 'EXPENSE_APPROVED', 'EXPENSE_REJECTED', 'ROLE_UPDATED', 'ADMIN_REQUEST_CREATED', 'ADMIN_REQUEST_DECIDED', 'EMAIL_SENT', 'EMAIL_FAILED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarKey" TEXT;

-- CreateTable
CREATE TABLE "AdminRequest" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "type" "AdminRequestType" NOT NULL,
    "status" "AdminRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "note" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminRequest_orgId_status_idx" ON "AdminRequest"("orgId", "status");

-- CreateIndex
CREATE INDEX "AdminRequest_orgId_targetUserId_status_idx" ON "AdminRequest"("orgId", "targetUserId", "status");

-- CreateIndex
CREATE INDEX "AdminRequest_orgId_createdById_status_idx" ON "AdminRequest"("orgId", "createdById", "status");

-- CreateIndex
CREATE UNIQUE INDEX "admin_request_dedupe" ON "AdminRequest"("orgId", "type", "createdById", "targetUserId", "status");

-- CreateIndex
CREATE INDEX "Notification_orgId_userId_readAt_createdAt_idx" ON "Notification"("orgId", "userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_orgId_userId_createdAt_idx" ON "Notification"("orgId", "userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminRequest" ADD CONSTRAINT "AdminRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRequest" ADD CONSTRAINT "AdminRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRequest" ADD CONSTRAINT "AdminRequest_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
