const fs = require('fs');
const file = 'prisma/schema.prisma';
let code = fs.readFileSync(file, 'utf8');

const orgFields = `  // SaaS Branding
  customDomain  String?  @unique
  themeColor    String   @default("#0D6EFD")
  supportEmail  String?
  supportPhone  String?

  // SaaS Modules (Feature Toggles)
  isPrintHubEnabled  Boolean @default(true)
  isTasksEnabled     Boolean @default(true)
  isAssetsEnabled    Boolean @default(true)
  isBillingEnabled   Boolean @default(false)
  isReportsEnabled   Boolean @default(true)

  // Subscription relations
  subscription   OrganizationSubscription?

  @@map("organizations")`;

code = code.replace('@@map("organizations")', orgFields);

const subModels = `
model SubscriptionPlan {
  id           String   @id @default(uuid())
  name         String
  price        Float
  billingCycle String   @default("MONTHLY") // "MONTHLY" | "YEARLY"
  maxUsers     Int      @default(5)
  features     Json?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  organizations OrganizationSubscription[]

  @@map("subscription_plans")
}

model OrganizationSubscription {
  id             String   @id @default(uuid())
  organizationId String   @unique
  planId         String
  startDate      DateTime @default(now())
  endDate        DateTime?
  status         String   @default("ACTIVE")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  plan         SubscriptionPlan @relation(fields: [planId], references: [id], onDelete: Restrict)

  @@map("organization_subscriptions")
}

model Branch {`;

code = code.replace('model Branch {', subModels);

fs.writeFileSync(file, code, 'utf8');
