-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'STAFF', 'TECHNICIAN', 'VENDOR_USER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "TrackingMode" AS ENUM ('INDIVIDUAL', 'QUANTITY', 'CONSUMABLE');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('OPERATIONAL', 'BREAKDOWN', 'UNDER_MAINTENANCE', 'DECOMMISSIONED', 'DISPOSED', 'TRANSFERRED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'NEEDS_ATTENTION', 'POOR', 'CRITICAL', 'SCRAP');

-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('OWNED', 'RENTAL', 'LEASE', 'EMI', 'VENDOR_OWNED', 'COMPLIMENTARY');

-- CreateEnum
CREATE TYPE "Criticality" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'REVIEWED', 'WORK_ORDER_CREATED', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'WAITING_FOR_APPROVAL', 'RESOLVED', 'VERIFIED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('DRAFT', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'COMPLETED', 'VERIFIED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceVisitStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PMFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUALLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PMStatus" AS ENUM ('UPCOMING', 'DUE', 'OVERDUE', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ISSUE_RAISED', 'ISSUE_ASSIGNED', 'ISSUE_UPDATED', 'WORK_ORDER_CREATED', 'WORK_ORDER_ASSIGNED', 'APPROVAL_REQUIRED', 'APPROVAL_COMPLETED', 'SLA_WARNING', 'SLA_BREACH', 'PM_DUE', 'PM_OVERDUE', 'CONTRACT_EXPIRING', 'WARRANTY_EXPIRING', 'CHECKIN', 'CHECKOUT', 'WORK_COMPLETED', 'VERIFICATION_REQUIRED', 'ISSUE_REOPENED', 'ASSET_TRANSFERRED', 'GENERAL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('REQUESTED', 'APPROVED', 'HANDOVER_INITIATED', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PURCHASE_INVOICE', 'WARRANTY_CARD', 'AMC_CONTRACT', 'RENTAL_AGREEMENT', 'LEASE_AGREEMENT', 'SERVICE_REPORT', 'TECHNICIAN_REPORT', 'INVOICE', 'MANUAL', 'CERTIFICATE', 'PHOTO', 'VIDEO', 'OTHER');

-- CreateEnum
CREATE TYPE "ChecklistQuestionType" AS ENUM ('YES_NO', 'PASS_FAIL', 'TEXT', 'NUMBER', 'DATE', 'PHOTO', 'SIGNATURE', 'MULTIPLE_CHOICE');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'WATCH', 'AT_RISK', 'CRITICAL');

-- CreateEnum
CREATE TYPE "WorkActionType" AS ENUM ('INSPECTION', 'CLEANING', 'ADJUSTMENT', 'REPAIR', 'PART_REPLACEMENT', 'FULL_REPLACEMENT', 'INSTALLATION', 'CONFIGURATION', 'PREVENTIVE_MAINTENANCE', 'TEMPORARY_FIX', 'PERMANENT_FIX', 'NO_FAULT_FOUND');

-- CreateEnum
CREATE TYPE "TestResult" AS ENUM ('PASS', 'FAIL', 'PARTIAL', 'NOT_TESTED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "logoUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "fiscalYear" TEXT NOT NULL DEFAULT 'April-March',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "managerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "building" TEXT,
    "floor" TEXT,
    "room" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "headUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "photoUrl" TEXT,
    "designation" TEXT,
    "department" TEXT,
    "address" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "mustChangePass" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RoleType" NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_branches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parentId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trackingMode" "TrackingMode" NOT NULL DEFAULT 'INDIVIDUAL',
    "defaultCriticality" "Criticality" NOT NULL DEFAULT 'MEDIUM',
    "defaultPMFrequency" "PMFrequency",
    "icon" TEXT,
    "color" TEXT,
    "customFields" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locationId" TEXT,
    "departmentId" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "barcode" TEXT,
    "qrCode" TEXT,
    "description" TEXT,
    "photoUrl" TEXT,
    "trackingMode" "TrackingMode" NOT NULL DEFAULT 'INDIVIDUAL',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "criticality" "Criticality" NOT NULL DEFAULT 'MEDIUM',
    "businessImpact" TEXT,
    "riskRating" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "building" TEXT,
    "room" TEXT,
    "exactPosition" TEXT,
    "custodianId" TEXT,
    "custodianName" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "installationDate" TIMESTAMP(3),
    "commissioningDate" TIMESTAMP(3),
    "expectedLifeYears" INTEGER,
    "endOfLifeDate" TIMESTAMP(3),
    "lastMaintenanceAt" TIMESTAMP(3),
    "purchaseCost" DECIMAL(12,2),
    "installationCost" DECIMAL(12,2),
    "initialDeposit" DECIMAL(12,2),
    "monthlyRental" DECIMAL(12,2),
    "emiAmount" DECIMAL(12,2),
    "securityDeposit" DECIMAL(12,2),
    "currentBookValue" DECIMAL(12,2),
    "replacementCost" DECIMAL(12,2),
    "ownershipType" "OwnershipType" NOT NULL DEFAULT 'OWNED',
    "healthScore" INTEGER,
    "healthStatus" "HealthStatus" NOT NULL DEFAULT 'HEALTHY',
    "customFields" JSONB,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_instances" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "instanceNo" INTEGER NOT NULL,
    "instanceTag" TEXT NOT NULL,
    "serialNumber" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_ownerships" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "ownershipType" "OwnershipType" NOT NULL,
    "ownerName" TEXT,
    "ownerContact" TEXT,
    "downPayment" DECIMAL(12,2),
    "monthlyAmount" DECIMAL(12,2),
    "totalAmount" DECIMAL(12,2),
    "securityDeposit" DECIMAL(12,2),
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "noticePeriodDays" INTEGER,
    "maintenanceBy" TEXT,
    "returnDate" TIMESTAMP(3),
    "notes" TEXT,
    "documents" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_contracts" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "vendorId" TEXT,
    "contractRef" TEXT,
    "contractType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "value" DECIMAL(12,2),
    "paymentFrequency" TEXT,
    "maintenanceCovered" BOOLEAN NOT NULL DEFAULT false,
    "slaTerms" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranties" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "vendorId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "terms" TEXT,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warranties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amcs" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "vendorId" TEXT,
    "contractNo" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "cost" DECIMAL(12,2),
    "coverage" TEXT,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "amcs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "alternatePhone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "bankDetails" JSONB,
    "servicesProvided" TEXT[],
    "specializations" TEXT[],
    "branchesServed" TEXT[],
    "rating" DECIMAL(3,2),
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "slaTerms" TEXT,
    "paymentTerms" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_contacts" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technicians" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT,
    "techId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "employeeId" TEXT,
    "specializations" TEXT[],
    "skillLevel" TEXT,
    "certifications" TEXT[],
    "photoUrl" TEXT,
    "idProofUrl" TEXT,
    "isExternal" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_performance" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "completedVisits" INTEGER NOT NULL DEFAULT 0,
    "avgResponseMins" INTEGER,
    "avgResolutionMins" INTEGER,
    "firstTimeFixRate" DECIMAL(5,2),
    "slaBreachCount" INTEGER NOT NULL DEFAULT 0,
    "repeatIssueCount" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "performanceScore" DECIMAL(5,2),
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "issueNo" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "criticality" "Criticality" NOT NULL DEFAULT 'MEDIUM',
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "immediateAction" TEXT,
    "rootCauseNote" TEXT,
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "slaResponseDue" TIMESTAMP(3),
    "slaResolutionDue" TIMESTAMP(3),
    "slaResponseBreached" BOOLEAN NOT NULL DEFAULT false,
    "slaResolutionBreached" BOOLEAN NOT NULL DEFAULT false,
    "downtimeStartAt" TIMESTAMP(3),
    "downtimeEndAt" TIMESTAMP(3),
    "totalDowntimeMins" INTEGER,
    "reopenCount" INTEGER NOT NULL DEFAULT 0,
    "lastReopenedAt" TIMESTAMP(3),
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_status_history" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "fromStatus" "IssueStatus",
    "toStatus" "IssueStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "workOrderNo" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "issueId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'OPEN',
    "requiredSkill" TEXT,
    "vendorId" TEXT,
    "technicianId" TEXT,
    "estimatedCost" DECIMAL(12,2),
    "actualCost" DECIMAL(12,2),
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "expectedDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "slaResolutionDue" TIMESTAMP(3),
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_assignments" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "work_order_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_visits" (
    "id" TEXT NOT NULL,
    "visitNo" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "issueId" TEXT,
    "vendorId" TEXT,
    "technicianId" TEXT,
    "serviceCategory" TEXT,
    "purpose" TEXT,
    "status" "ServiceVisitStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledDate" TIMESTAMP(3),
    "checkInAt" TIMESTAMP(3),
    "workStartAt" TIMESTAMP(3),
    "workEndAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "totalDurationMins" INTEGER,
    "travelTimeMins" INTEGER,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_checkins" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "techName" TEXT NOT NULL,
    "company" TEXT,
    "mobile" TEXT NOT NULL,
    "specialization" TEXT,
    "purpose" TEXT,
    "authorizedBy" TEXT,
    "visitorId" TEXT,
    "vehicleNumber" TEXT,
    "photoUrl" TEXT,
    "entryPoint" TEXT,
    "checkInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "service_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_checkouts" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "workCompleted" BOOLEAN NOT NULL DEFAULT false,
    "assetStatus" "AssetStatus",
    "pendingWork" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "nextVisitDate" TIMESTAMP(3),
    "techRemarks" TEXT,
    "managerRemarks" TEXT,
    "checkOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "documents" TEXT[],
    "evidencePhotos" TEXT[],

    CONSTRAINT "service_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnoses" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "observedProblem" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "rootCause" TEXT,
    "rootCauseCategory" TEXT,
    "severity" TEXT,
    "estimatedCost" DECIMAL(12,2),
    "estimatedTime" TEXT,
    "partsRequired" TEXT,
    "recommendedAction" TEXT,
    "photos" TEXT[],
    "videos" TEXT[],
    "notes" TEXT,
    "diagnosedBy" TEXT NOT NULL,
    "diagnosedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_actions" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "actionType" "WorkActionType" NOT NULL,
    "description" TEXT NOT NULL,
    "timeSpentMins" INTEGER,
    "beforePhotos" TEXT[],
    "afterPhotos" TEXT[],
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "work_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_results" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "checklistId" TEXT,
    "result" TEXT NOT NULL DEFAULT 'NOT_TESTED',
    "notes" TEXT,
    "evidencePhotos" TEXT[],
    "testedBy" TEXT NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checklistResponses" JSONB,

    CONSTRAINT "test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "verifiedBy" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issueResolved" BOOLEAN NOT NULL DEFAULT false,
    "workCompleted" BOOLEAN NOT NULL DEFAULT false,
    "assetOperational" BOOLEAN NOT NULL DEFAULT false,
    "testPassed" BOOLEAN NOT NULL DEFAULT false,
    "documentsOk" BOOLEAN NOT NULL DEFAULT false,
    "partsOk" BOOLEAN NOT NULL DEFAULT false,
    "costOk" BOOLEAN NOT NULL DEFAULT false,
    "photosOk" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "requireFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" TIMESTAMP(3),

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spare_parts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "partCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "unit" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minLevel" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(10,2),
    "supplierId" TEXT,
    "supplierPartNo" TEXT,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spare_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(10,2),
    "totalCost" DECIMAL(12,2),
    "reference" TEXT,
    "notes" TEXT,
    "doneBy" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts_used" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "partId" TEXT,
    "partName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(10,2),
    "totalCost" DECIMAL(12,2),
    "oldPartSerial" TEXT,
    "newPartSerial" TEXT,
    "warrantyMonths" INTEGER,
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parts_used_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "assetId" TEXT,
    "workOrderId" TEXT,
    "visitId" TEXT,
    "categoryType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "vendorId" TEXT,
    "invoiceUrl" TEXT,
    "approvedBy" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "usedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_periods" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "allocated" DECIMAL(12,2) NOT NULL,
    "used" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "PMFrequency" NOT NULL,
    "estimatedMins" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_questions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "type" "ChecklistQuestionType" NOT NULL DEFAULT 'YES_NO',
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isPassFail" BOOLEAN NOT NULL DEFAULT false,
    "requirePhoto" BOOLEAN NOT NULL DEFAULT false,
    "failureAlert" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_plans" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "categoryId" TEXT,
    "checklistId" TEXT,
    "name" TEXT NOT NULL,
    "frequency" "PMFrequency" NOT NULL,
    "customDays" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "assignedTo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pm_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_pm_plans" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,

    CONSTRAINT "asset_pm_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_schedules" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "assetId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "PMStatus" NOT NULL DEFAULT 'UPCOMING',
    "assignedTo" TEXT,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "nextDueDate" TIMESTAMP(3),
    "result" TEXT,
    "notes" TEXT,
    "evidencePhotos" TEXT[],
    "responses" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pm_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_rules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryType" TEXT,
    "minAmount" DECIMAL(12,2),
    "maxAmount" DECIMAL(12,2),
    "approverRole" "RoleType" NOT NULL,
    "approverUserId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "requestedBy" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "level" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(12,2),
    "remarks" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_rules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" "IssuePriority" NOT NULL,
    "responseTargetMins" INTEGER NOT NULL,
    "arrivalTargetMins" INTEGER,
    "resolutionTargetMins" INTEGER NOT NULL,
    "escalationLevel1Mins" INTEGER,
    "escalationLevel2Mins" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "assetId" TEXT,
    "vendorId" TEXT,
    "visitId" TEXT,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "referenceType" TEXT,
    "referenceId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_transfers" (
    "id" TEXT NOT NULL,
    "transferNo" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "fromBranchId" TEXT NOT NULL,
    "toBranchId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "receivedBy" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT,
    "notes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "handoverAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "documents" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_audits" (
    "id" TEXT NOT NULL,
    "auditNo" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "conductedDate" TIMESTAMP(3),
    "conductedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_audit_items" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "expectedLocation" TEXT,
    "actualLocation" TEXT,
    "found" BOOLEAN NOT NULL DEFAULT true,
    "condition" "AssetCondition",
    "custodian" TEXT,
    "photoUrl" TEXT,
    "mismatch" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "auditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_audit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_health_scores" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "status" "HealthStatus" NOT NULL,
    "ageScore" INTEGER,
    "breakdownScore" INTEGER,
    "downtimeScore" INTEGER,
    "costScore" INTEGER,
    "pmComplianceScore" INTEGER,
    "conditionScore" INTEGER,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_health_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replacement_reviews" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "reviewedBy" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cumulativeCost" DECIMAL(12,2),
    "last12MonthCost" DECIMAL(12,2),
    "breakdownCount" INTEGER,
    "totalDowntimeDays" INTEGER,
    "replacementCost" DECIMAL(12,2),
    "recommendation" TEXT NOT NULL,
    "decisionBy" TEXT,
    "decisionAt" TIMESTAMP(3),
    "decision" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "replacement_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_articles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetId" TEXT,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "symptom" TEXT NOT NULL,
    "possibleCauses" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "estimatedTime" TEXT,
    "requiredParts" TEXT,
    "tags" TEXT[],
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "userRole" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceNo" TEXT,
    "branchId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branches_organizationId_code_key" ON "branches"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_organizationId_type_key" ON "roles"("organizationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "user_roles"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_branches_userId_branchId_key" ON "user_branches"("userId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_organizationId_code_key" ON "asset_categories"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "assets_assetId_key" ON "assets"("assetId");

-- CreateIndex
CREATE INDEX "assets_branchId_idx" ON "assets"("branchId");

-- CreateIndex
CREATE INDEX "assets_categoryId_idx" ON "assets"("categoryId");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_assetId_idx" ON "assets"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_instances_instanceTag_key" ON "asset_instances"("instanceTag");

-- CreateIndex
CREATE UNIQUE INDEX "asset_ownerships_assetId_key" ON "asset_ownerships"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_contracts_assetId_key" ON "asset_contracts"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "warranties_assetId_key" ON "warranties"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "amcs_assetId_key" ON "amcs"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_organizationId_code_key" ON "vendors"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "technicians_techId_key" ON "technicians"("techId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_performance_vendorId_key" ON "vendor_performance"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "issues_issueNo_key" ON "issues"("issueNo");

-- CreateIndex
CREATE INDEX "issues_branchId_status_idx" ON "issues"("branchId", "status");

-- CreateIndex
CREATE INDEX "issues_assetId_idx" ON "issues"("assetId");

-- CreateIndex
CREATE INDEX "issues_priority_status_idx" ON "issues"("priority", "status");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_workOrderNo_key" ON "work_orders"("workOrderNo");

-- CreateIndex
CREATE INDEX "work_orders_branchId_status_idx" ON "work_orders"("branchId", "status");

-- CreateIndex
CREATE INDEX "work_orders_assetId_idx" ON "work_orders"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "service_visits_visitNo_key" ON "service_visits"("visitNo");

-- CreateIndex
CREATE INDEX "service_visits_branchId_status_idx" ON "service_visits"("branchId", "status");

-- CreateIndex
CREATE INDEX "service_visits_assetId_idx" ON "service_visits"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "service_checkins_visitId_key" ON "service_checkins"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "service_checkouts_visitId_key" ON "service_checkouts"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnoses_visitId_key" ON "diagnoses"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_visitId_key" ON "verifications"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "spare_parts_partCode_key" ON "spare_parts"("partCode");

-- CreateIndex
CREATE INDEX "inventory_transactions_partId_idx" ON "inventory_transactions"("partId");

-- CreateIndex
CREATE INDEX "cost_entries_branchId_recordedAt_idx" ON "cost_entries"("branchId", "recordedAt");

-- CreateIndex
CREATE INDEX "cost_entries_assetId_idx" ON "cost_entries"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_pm_plans_assetId_planId_key" ON "asset_pm_plans"("assetId", "planId");

-- CreateIndex
CREATE INDEX "pm_schedules_dueDate_status_idx" ON "pm_schedules"("dueDate", "status");

-- CreateIndex
CREATE INDEX "documents_referenceType_referenceId_idx" ON "documents"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "asset_transfers_transferNo_key" ON "asset_transfers"("transferNo");

-- CreateIndex
CREATE UNIQUE INDEX "asset_audits_auditNo_key" ON "asset_audits"("auditNo");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resourceId_idx" ON "audit_logs"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "asset_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_instances" ADD CONSTRAINT "asset_instances_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_ownerships" ADD CONSTRAINT "asset_ownerships_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_contracts" ADD CONSTRAINT "asset_contracts_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amcs" ADD CONSTRAINT "amcs_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_performance" ADD CONSTRAINT "vendor_performance_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_status_history" ADD CONSTRAINT "issue_status_history_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_assignments" ADD CONSTRAINT "work_order_assignments_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_assignments" ADD CONSTRAINT "work_order_assignments_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_visits" ADD CONSTRAINT "service_visits_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_visits" ADD CONSTRAINT "service_visits_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_visits" ADD CONSTRAINT "service_visits_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_visits" ADD CONSTRAINT "service_visits_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_visits" ADD CONSTRAINT "service_visits_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_checkins" ADD CONSTRAINT "service_checkins_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "service_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_checkins" ADD CONSTRAINT "service_checkins_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_checkouts" ADD CONSTRAINT "service_checkouts_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "service_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "service_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_actions" ADD CONSTRAINT "work_actions_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "service_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "service_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "service_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_partId_fkey" FOREIGN KEY ("partId") REFERENCES "spare_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts_used" ADD CONSTRAINT "parts_used_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "service_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts_used" ADD CONSTRAINT "parts_used_partId_fkey" FOREIGN KEY ("partId") REFERENCES "spare_parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "service_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_questions" ADD CONSTRAINT "checklist_questions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "checklist_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_plans" ADD CONSTRAINT "pm_plans_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_plans" ADD CONSTRAINT "pm_plans_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_plans" ADD CONSTRAINT "pm_plans_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "checklist_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_pm_plans" ADD CONSTRAINT "asset_pm_plans_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_pm_plans" ADD CONSTRAINT "asset_pm_plans_planId_fkey" FOREIGN KEY ("planId") REFERENCES "pm_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_schedules" ADD CONSTRAINT "pm_schedules_planId_fkey" FOREIGN KEY ("planId") REFERENCES "pm_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "service_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_audits" ADD CONSTRAINT "asset_audits_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_audit_items" ADD CONSTRAINT "asset_audit_items_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "asset_audits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_audit_items" ADD CONSTRAINT "asset_audit_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_health_scores" ADD CONSTRAINT "asset_health_scores_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replacement_reviews" ADD CONSTRAINT "replacement_reviews_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
