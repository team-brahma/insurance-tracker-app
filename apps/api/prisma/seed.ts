import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`),
});
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';

const url = new URL(
  process.env.DATABASE_URL ?? 'mysql://root:password@localhost:3306/insurance_tracker',
);

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port || '3306', 10),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace('/', ''),
  connectionLimit: 5,
});

const db = new PrismaClient({ adapter });

function getPolicyTypeId(policyTypesMap: Record<string, string>, key: string): string {
  const policyTypeId = policyTypesMap[key];
  if (!policyTypeId) {
    throw new Error(`Missing policy type seed mapping for ${key}`);
  }
  return policyTypeId;
}

async function main() {
  console.log('--- Starting Database Seed/Backfill ---');

  // Seed policy types
  const policyTypesData = [
    { id: 'f8a55cf9-7601-4475-b89e-2dc3d7e5d87a', name: 'Motor' },
    { id: 'e22851cf-41c3-4d64-be57-e6f79e830d9a', name: "Workmen's Comp" },
    { id: 'cb8e5c82-841a-4ea8-b80c-03cd58529241', name: 'Health' },
    { id: 'a37eb5f0-6a97-4c4f-a2e6-fa986d5e1b12', name: 'Group Health' },
    { id: 'd46cb7d9-c052-4467-bc1a-5b128c7c945a', name: 'Fire' },
    { id: 'b87cddf0-cf1a-446c-bd42-f81628dcd98b', name: 'Burglary' },
    { id: 'cf7e6da8-2a1d-44a8-a664-df82cd739f88', name: 'All Risk' },
    { id: 'e91244ab-6c3e-4d57-b08e-c90a8a614210', name: 'Doctor Policy' },
    { id: 'a57e3f89-8d7b-4029-9e8a-72efb6dc9a2b', name: 'New' },
    { id: 'f52e50ab-6b71-482a-a53d-27b686d11fca', name: 'Other' },
  ];

  const policyTypesMap: Record<string, string> = {};
  for (const pt of policyTypesData) {
    const created = await db.policyTypeMaster.upsert({
      where: { name: pt.name },
      update: {},
      create: pt,
    });
    const key = pt.name === "Workmen's Comp" ? 'WC' : pt.name.toUpperCase().replace(' ', '_');
    policyTypesMap[key] = created.id;
  }

  // Seed insurance providers
  const insuranceProvidersData = [
    { id: '11111111-1111-4111-8111-111111111111', name: 'HDFC ERGO' },
    { id: '22222222-2222-4222-8222-222222222222', name: 'Star Health' },
    { id: '33333333-3333-4333-8333-333333333333', name: 'ICICI Lombard' },
    { id: '44444444-4444-4444-8444-444444444444', name: 'TATA AIG' },
    { id: '55555555-5555-4555-8555-555555555555', name: 'Bajaj Allianz' },
    { id: '66666666-6666-4666-8666-666666666666', name: 'LIC' },
    { id: '77777777-7777-4777-8777-777777777777', name: 'New India Assurance' },
  ];

  for (const ip of insuranceProvidersData) {
    await db.insuranceProviderMaster.upsert({
      where: { name: ip.name },
      update: {},
      create: ip,
    });
  }

  async function createPolicyWithHistory(data: {
    agentId: string;
    clientId: string;
    policyTypeId: string;
    vehicleNumber?: string;
    policyNumber: string;
    premiumPrice?: number;
    endDate: Date;
    renewalStatus: 'PENDING' | 'REMINDED' | 'RENEWED' | 'NOT_RENEWED' | 'LAPSED';
    paymentLink?: string;
    referenceNote?: string;
  }) {
    return db.$transaction(async (tx) => {
      const policy = await tx.policy.create({ data });
      await tx.policyStatusHistory.create({
        data: {
          policyId: policy.id,
          previousStatus: null,
          newStatus: data.renewalStatus,
          changedById: data.agentId,
        },
      });
      return policy;
    });
  }

  async function createEnquiryWithHistory(data: {
    agentId: string;
    name: string;
    mobileNumber: string;
    policyTypeId: string;
    referredBy?: string | null;
    remindOn: Date | null;
    status: 'OPEN' | 'CONVERTED' | 'DROPPED';
    vehicleNumber?: string | null;
  }) {
    return db.$transaction(async (tx) => {
      const enquiry = await tx.enquiry.create({
        data: {
          agentId: data.agentId,
          name: data.name,
          mobileNumber: data.mobileNumber,
          policyTypeId: data.policyTypeId,
          referredBy: data.referredBy ?? null,
          remindOn: data.remindOn,
          status: data.status,
          vehicleNumber: data.vehicleNumber ?? null,
        },
      });
      await tx.enquiryStatusHistory.create({
        data: {
          enquiryId: enquiry.id,
          previousStatus: null,
          newStatus: data.status,
          changedById: data.agentId,
        },
      });
      return enquiry;
    });
  }

  // 1. Create or retrieve admin user
  let adminUser = await db.user.findUnique({
    where: { email: 'admin@insurtrack.com' },
  });
  if (!adminUser) {
    const hashedAdmin = await bcrypt.hash('admin123', 12);
    adminUser = await db.user.create({
      data: {
        email: 'admin@insurtrack.com',
        password: hashedAdmin,
        name: 'Admin User',
        role: 'ADMIN',
      },
    });
    console.log(`Created admin user: ${adminUser.email} (password: admin123)`);
  } else {
    console.log(`Admin user already exists: ${adminUser.email}`);
  }

  // 2. Create or retrieve dummy agent user
  let agentUser = await db.user.findUnique({
    where: { email: 'agent@insurtrack.com' },
  });
  if (!agentUser) {
    const hashedAgent = await bcrypt.hash('agent123', 12);
    agentUser = await db.user.create({
      data: {
        email: 'agent@insurtrack.com',
        password: hashedAgent,
        name: 'Dummy Agent',
        role: 'AGENT',
      },
    });
    console.log(`Created dummy agent user: ${agentUser.email} (password: agent123)`);
  } else {
    console.log(`Dummy agent user already exists: ${agentUser.email}`);
  }

  // 3. Ensure Settings exist for both users
  const adminSettings = await db.settings.findUnique({
    where: { agentId: adminUser.id },
  });
  if (!adminSettings) {
    await db.settings.create({
      data: { agentId: adminUser.id },
    });
    console.log(`Created default settings for admin user`);
  }

  const agentSettings = await db.settings.findUnique({
    where: { agentId: agentUser.id },
  });
  if (!agentSettings) {
    await db.settings.create({
      data: { agentId: agentUser.id },
    });
    console.log(`Created default settings for agent user`);
  }

  // 4. Backfill any existing Client and Policy records to point to the agentUser
  try {
    const clientsToBackfill = await db.client.count({
      where: { NOT: { agentId: agentUser.id } },
    });
    if (clientsToBackfill > 0) {
      await db.client.updateMany({
        data: { agentId: agentUser.id },
      });
      console.log(
        `Backfilled ${String(clientsToBackfill)} clients to reference agent ID: ${agentUser.id}`,
      );
    }

    const policiesToBackfill = await db.policy.count({
      where: { NOT: { agentId: agentUser.id } },
    });
    if (policiesToBackfill > 0) {
      await db.policy.updateMany({
        data: { agentId: agentUser.id },
      });
      console.log(
        `Backfilled ${String(policiesToBackfill)} policies to reference agent ID: ${agentUser.id}`,
      );
    }
  } catch {
    console.log('Skipping backfill due to unique constraint on existing records');
  }

  // 5. If clients and policies are completely empty, seed realistic dummy data
  const clientsCount = await db.client.count();
  const policiesCount = await db.policy.count();

  if (clientsCount === 0 && policiesCount === 0) {
    console.log('Database has no clients or policies. Seeding realistic dummy data...');

    // Seed Clients
    const clientDinesh = await db.client.create({
      data: {
        agentId: agentUser.id,
        insuredName: 'Dinesh Kumar',
        mobileNumber: '+919876543210',
      },
    });

    const clientPriya = await db.client.create({
      data: {
        agentId: agentUser.id,
        insuredName: 'Priya Sharma',
        mobileNumber: '+919876543211',
      },
    });

    const clientAmit = await db.client.create({
      data: {
        agentId: agentUser.id,
        insuredName: 'Amit Patel',
        mobileNumber: '+919876543212',
      },
    });

    console.log('Seeded 3 clients.');

    // Seed Policies
    await createPolicyWithHistory({
      agentId: agentUser.id,
      clientId: clientDinesh.id,
      policyTypeId: getPolicyTypeId(policyTypesMap, 'MOTOR'),
      vehicleNumber: 'TN38AB1234',
      policyNumber: 'POL-MOTOR-101',
      premiumPrice: 15000,
      endDate: new Date('2026-08-15T00:00:00.000Z'),
      renewalStatus: 'PENDING',
      paymentLink: 'https://pay.insurer.com/dinesh-101',
      referenceNote: 'Car insurance',
    });
    await createPolicyWithHistory({
      agentId: agentUser.id,
      clientId: clientDinesh.id,
      policyTypeId: getPolicyTypeId(policyTypesMap, 'HEALTH'),
      policyNumber: 'POL-HEALTH-202',
      premiumPrice: 8500,
      endDate: new Date('2026-12-20T00:00:00.000Z'),
      renewalStatus: 'PENDING',
      paymentLink: 'https://pay.insurer.com/dinesh-202',
      referenceNote: 'Family health insurance',
    });
    await createPolicyWithHistory({
      agentId: agentUser.id,
      clientId: clientPriya.id,
      policyTypeId: getPolicyTypeId(policyTypesMap, 'FIRE'),
      policyNumber: 'POL-FIRE-303',
      premiumPrice: 22000,
      endDate: new Date('2026-09-01T00:00:00.000Z'),
      renewalStatus: 'PENDING',
      paymentLink: 'https://pay.insurer.com/priya-303',
      referenceNote: 'Home fire insurance',
    });
    await createPolicyWithHistory({
      agentId: agentUser.id,
      clientId: clientAmit.id,
      policyTypeId: getPolicyTypeId(policyTypesMap, 'BURGLARY'),
      policyNumber: 'POL-BURG-404',
      premiumPrice: 12000,
      endDate: new Date('2026-07-20T00:00:00.000Z'),
      renewalStatus: 'PENDING',
      paymentLink: 'https://pay.insurer.com/amit-404',
      referenceNote: 'Shop safety insurance',
    });

    console.log('Seeded 4 policies.');

    // Seed Enquiries
    await createEnquiryWithHistory({
      agentId: agentUser.id,
      name: 'Rajesh Varma',
      mobileNumber: '9876543210',
      policyTypeId: getPolicyTypeId(policyTypesMap, 'MOTOR'),
      referredBy: 'Friend',
      remindOn: new Date('2026-08-01T00:00:00.000Z'),
      status: 'OPEN',
      vehicleNumber: 'KA01AB1234',
    });
    await createEnquiryWithHistory({
      agentId: agentUser.id,
      name: 'Sunita Rao',
      mobileNumber: '9123456789',
      policyTypeId: getPolicyTypeId(policyTypesMap, 'HEALTH'),
      referredBy: 'Google Search',
      remindOn: new Date('2026-07-15T00:00:00.000Z'),
      status: 'OPEN',
    });
    await createEnquiryWithHistory({
      agentId: agentUser.id,
      name: 'Karan Malhotra',
      mobileNumber: '9988776655',
      policyTypeId: getPolicyTypeId(policyTypesMap, 'FIRE'),
      referredBy: 'Existing Customer',
      remindOn: null,
      status: 'DROPPED',
    });
    console.log('Seeded 3 enquiries.');
  }

  console.log('--- Database Seed/Backfill Completed Successfully ---');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
