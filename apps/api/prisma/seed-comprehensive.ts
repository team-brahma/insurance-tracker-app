import 'dotenv/config';
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

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function daysAgo(days: number): Date {
  return daysFromNow(-days);
}

async function main() {
  console.log('--- Seeding Comprehensive Dummy Data ---');

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

  async function createPolicyWithHistory(data: {
    agentId: string;
    clientId: string;
    policyTypeId: string;
    vehicleNumber?: string;
    policyNumber: string;
    premiumPrice: number | null;
    endDate: Date;
    renewalStatus: 'PENDING' | 'REMINDED' | 'RENEWED' | 'NOT_RENEWED' | 'LAPSED';
    paymentLink?: string;
    referenceNote?: string;
    typeNote?: string;
    renewalNotice?: string;
    lastRemindedAt?: Date;
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
    referredBy: string;
    remindOn: Date | null;
    status: 'OPEN' | 'CONVERTED' | 'DROPPED';
  }) {
    return db.$transaction(async (tx) => {
      const enquiry = await tx.enquiry.create({ data });
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
    const hashed = await bcrypt.hash('agent123', 12);
    agentUser = await db.user.create({
      data: {
        email: 'agent@insurtrack.com',
        password: hashed,
        name: 'Dummy Agent',
        role: 'AGENT',
      },
    });
    console.log('Created dummy agent user');
  } else {
    console.log(`Using agent: ${agentUser.email} (${agentUser.id})`);
  }

  await db.settings.upsert({
    where: { agentId: agentUser.id },
    create: { agentId: agentUser.id, reminderOffsets: [7, 1, 0] },
    update: { reminderOffsets: [7, 1, 0] },
  });

  // ── Clients ──────────────────────────────────────────────
  const clientData = [
    { insuredName: 'Ravi Singh', mobileNumber: '+919876543213' },
    { insuredName: 'Sita Verma', mobileNumber: '+919876543214' },
    { insuredName: 'Ananya Gupta', mobileNumber: '+919876543215' },
    { insuredName: 'Vikram Joshi', mobileNumber: '+919876543216' },
    { insuredName: 'Neha Patel', mobileNumber: '+919876543200' },
  ];

  const clientIds: Record<string, string> = {};

  for (const c of clientData) {
    const name = c.insuredName;
    const existing = await db.client.findFirst({
      where: { insuredName: name, agentId: agentUser.id },
    });
    if (existing) {
      clientIds[name] = existing.id;
      console.log(`Client already exists: ${name}`);
    } else {
      const created = await db.client.create({
        data: {
          agentId: agentUser.id,
          insuredName: name,
          mobileNumber: c.mobileNumber,
        },
      });
      clientIds[name] = created.id;
      console.log(`Created client: ${name}`);
    }
  }

  // Map existing clients from the original seed too
  for (const name of ['Dinesh Kumar', 'Priya Sharma', 'Amit Patel']) {
    const existing = await db.client.findFirst({
      where: { insuredName: name, agentId: agentUser.id },
    });
    if (existing) {
      clientIds[name] = existing.id;
    }
  }

  // ── Policy scenarios ─────────────────────────────────────
  interface PolicyInput {
    clientKey: string;
    policyType: string;
    vehicleNumber?: string;
    policyNumber: string;
    premiumPrice: number | null;
    endDate: Date;
    renewalStatus: string;
    paymentLink?: string;
    referenceNote?: string;
    typeNote?: string;
    renewalNotice?: string;
    lastRemindedAt?: Date;
  }

  const policies: PolicyInput[] = [
    // ═══ OVERDUE (endDate < today) ═════════════════════════
    {
      clientKey: 'Ravi Singh',
      policyType: 'HEALTH',
      policyNumber: 'POL-DUMMY-OVD-01',
      premiumPrice: 9500,
      endDate: daysAgo(50),
      renewalStatus: 'PENDING',
      referenceNote: 'Health policy still pending despite being overdue',
    },
    {
      clientKey: 'Amit Patel',
      policyType: 'MOTOR',
      vehicleNumber: 'TN38CD5678',
      policyNumber: 'POL-DUMMY-OVD-02',
      premiumPrice: 16000,
      endDate: daysAgo(64),
      renewalStatus: 'REMINDED',
      referenceNote: 'Car policy - reminded before expiry',
      lastRemindedAt: daysAgo(70),
    },
    {
      clientKey: 'Sita Verma',
      policyType: 'WC',
      policyNumber: 'POL-DUMMY-OVD-03',
      premiumPrice: 22000,
      endDate: daysAgo(75),
      renewalStatus: 'RENEWED',
      typeNote: 'Workers comp renewed on time',
      renewalNotice: 'Policy was renewed successfully',
    },
    {
      clientKey: 'Ananya Gupta',
      policyType: 'FIRE',
      policyNumber: 'POL-DUMMY-OVD-04',
      premiumPrice: 18000,
      endDate: daysAgo(125),
      renewalStatus: 'NOT_RENEWED',
      referenceNote: 'Client chose not to renew fire policy',
    },
    {
      clientKey: 'Missing Contact Client',
      policyType: 'ALL_RISK',
      policyNumber: 'POL-DUMMY-OVD-05',
      premiumPrice: 30000,
      endDate: daysAgo(140),
      renewalStatus: 'LAPSED',
      referenceNote: 'No contact - policy lapsed',
    },
    {
      clientKey: 'Vikram Joshi',
      policyType: 'DOCTOR_POLICY',
      policyNumber: 'POL-DUMMY-OVD-06',
      premiumPrice: null,
      endDate: daysAgo(33),
      renewalStatus: 'LAPSED',
      referenceNote: 'Doctor policy with null premium - lapsed',
    },

    // ═══ DUE 7 (today <= endDate <= today+7) ═══════════════
    {
      clientKey: 'Ravi Singh',
      policyType: 'GROUP_HEALTH',
      policyNumber: 'POL-DUMMY-D7-01',
      premiumPrice: 42000,
      endDate: daysFromNow(4),
      renewalStatus: 'PENDING',
      paymentLink: 'https://pay.insurer.com/ravi-group',
      referenceNote: 'Group health for 10 employees',
    },
    {
      clientKey: 'Sita Verma',
      policyType: 'DOCTOR_POLICY',
      policyNumber: 'POL-DUMMY-D7-02',
      premiumPrice: 8500,
      endDate: daysFromNow(6),
      renewalStatus: 'REMINDED',
      lastRemindedAt: daysAgo(1),
      renewalNotice: 'Reminder: Doctor policy due in 6 days',
    },
    {
      clientKey: 'Vikram Joshi',
      policyType: 'MOTOR',
      vehicleNumber: 'MH12AB3456',
      policyNumber: 'POL-DUMMY-D7-03',
      premiumPrice: 14500,
      endDate: daysFromNow(5),
      renewalStatus: 'PENDING',
      paymentLink: 'https://pay.insurer.com/vikram-motor',
    },
    {
      clientKey: 'Dinesh Kumar',
      policyType: 'BURGLARY',
      policyNumber: 'POL-DUMMY-D7-04',
      premiumPrice: 12500,
      endDate: daysFromNow(3),
      renewalStatus: 'REMINDED',
      lastRemindedAt: daysAgo(2),
    },

    // ═══ DUE TODAY / TOMORROW / 7 DAYS (matches default offsets [7,1,0]) ═══
    {
      clientKey: 'Ravi Singh',
      policyType: 'MOTOR',
      vehicleNumber: 'KA01XY7890',
      policyNumber: 'POL-DUMMY-TODAY-01',
      premiumPrice: 12000,
      endDate: daysFromNow(0),
      renewalStatus: 'PENDING',
      referenceNote: 'Expires today — should trigger offset 0 reminder',
    },
    {
      clientKey: 'Sita Verma',
      policyType: 'HEALTH',
      policyNumber: 'POL-DUMMY-TODAY-02',
      premiumPrice: 15000,
      endDate: daysFromNow(1),
      renewalStatus: 'PENDING',
      referenceNote: 'Expires tomorrow — should trigger offset 1 reminder',
    },
    {
      clientKey: 'Ananya Gupta',
      policyType: 'FIRE',
      policyNumber: 'POL-DUMMY-TODAY-03',
      premiumPrice: 20000,
      endDate: daysFromNow(7),
      renewalStatus: 'PENDING',
      referenceNote: 'Expires in 7 days — should trigger offset 7 reminder',
    },

    // ═══ DUE 30 (today+7 < endDate <= today+30) ═══════════
    {
      clientKey: 'Ananya Gupta',
      policyType: 'NEW',
      policyNumber: 'POL-DUMMY-D30-01',
      premiumPrice: 4500,
      endDate: daysFromNow(20),
      renewalStatus: 'PENDING',
      typeNote: 'New policy - first time',
    },
    {
      clientKey: 'Amit Patel',
      policyType: 'OTHER',
      policyNumber: 'POL-DUMMY-D30-02',
      premiumPrice: 7000,
      endDate: daysFromNow(24),
      renewalStatus: 'PENDING',
      referenceNote: 'Miscellaneous insurance',
    },
    {
      clientKey: 'Priya Sharma',
      policyType: 'HEALTH',
      policyNumber: 'POL-DUMMY-D30-03',
      premiumPrice: 9200,
      endDate: daysFromNow(16),
      renewalStatus: 'REMINDED',
      lastRemindedAt: daysAgo(3),
      renewalNotice: 'Health insurance due soon',
    },
    {
      clientKey: 'Ravi Singh',
      policyType: 'WC',
      policyNumber: 'POL-DUMMY-D30-04',
      premiumPrice: null,
      endDate: daysFromNow(14),
      renewalStatus: 'PENDING',
      referenceNote: 'WC policy with no premium set yet',
    },
    {
      clientKey: 'Sita Verma',
      policyType: 'FIRE',
      policyNumber: 'POL-DUMMY-D30-05',
      premiumPrice: 26000,
      endDate: daysFromNow(25),
      renewalStatus: 'RENEWED',
      renewalNotice: 'Fire policy renewed for another year',
    },
    {
      clientKey: 'Vikram Joshi',
      policyType: 'BURGLARY',
      policyNumber: 'POL-DUMMY-D30-06',
      premiumPrice: 13000,
      endDate: daysFromNow(28),
      renewalStatus: 'NOT_RENEWED',
      referenceNote: 'Client declined renewal',
    },

    // ═══ FUTURE (endDate > today+30) ════════════════════════
    {
      clientKey: 'Sita Verma',
      policyType: 'ALL_RISK',
      policyNumber: 'POL-DUMMY-FUT-01',
      premiumPrice: 55000,
      endDate: daysFromNow(230),
      renewalStatus: 'PENDING',
      paymentLink: 'https://pay.insurer.com/sita-allrisk',
    },
    {
      clientKey: 'Vikram Joshi',
      policyType: 'HEALTH',
      policyNumber: 'POL-DUMMY-FUT-02',
      premiumPrice: 8800,
      endDate: daysFromNow(52),
      renewalStatus: 'PENDING',
    },
    {
      clientKey: 'Dinesh Kumar',
      policyType: 'MOTOR',
      vehicleNumber: 'KA05CD7890',
      policyNumber: 'POL-DUMMY-FUT-03',
      premiumPrice: 15800,
      endDate: daysFromNow(98),
      renewalStatus: 'PENDING',
      paymentLink: 'https://pay.insurer.com/dinesh-motor2',
    },
    {
      clientKey: 'Ananya Gupta',
      policyType: 'GROUP_HEALTH',
      policyNumber: 'POL-DUMMY-FUT-04',
      premiumPrice: 52000,
      endDate: daysFromNow(150),
      renewalStatus: 'PENDING',
      referenceNote: 'Group health for 15 employees',
    },
    {
      clientKey: 'Missing Contact Client',
      policyType: 'DOCTOR_POLICY',
      policyNumber: 'POL-DUMMY-FUT-05',
      premiumPrice: 11000,
      endDate: daysFromNow(165),
      renewalStatus: 'PENDING',
    },
    {
      clientKey: 'Priya Sharma',
      policyType: 'NEW',
      policyNumber: 'POL-DUMMY-FUT-06',
      premiumPrice: 3500,
      endDate: daysFromNow(332),
      renewalStatus: 'PENDING',
    },
    {
      clientKey: 'Ravi Singh',
      policyType: 'FIRE',
      policyNumber: 'POL-DUMMY-FUT-07',
      premiumPrice: 28000,
      endDate: daysFromNow(103),
      renewalStatus: 'PENDING',
      paymentLink: 'https://pay.insurer.com/ravi-fire',
    },
    {
      clientKey: 'Amit Patel',
      policyType: 'GROUP_HEALTH',
      policyNumber: 'POL-DUMMY-FUT-08',
      premiumPrice: 38000,
      endDate: daysFromNow(47),
      renewalStatus: 'RENEWED',
      typeNote: 'Group health renewed early',
    },
  ];

  let createdCount = 0;
  let skippedCount = 0;

  for (const p of policies) {
    const clientId = clientIds[p.clientKey];
    if (!clientId) {
      console.warn(`  Skipped – client not found: ${p.clientKey}`);
      skippedCount++;
      continue;
    }

    const existing = await db.policy.findFirst({
      where: { policyNumber: p.policyNumber },
    });
    if (existing) {
      console.log(`  Skipped (exists): ${p.policyNumber}`);
      skippedCount++;
      continue;
    }

    await createPolicyWithHistory({
      agentId: agentUser.id,
      clientId,
      policyTypeId: getPolicyTypeId(policyTypesMap, p.policyType),
      policyNumber: p.policyNumber,
      premiumPrice: p.premiumPrice,
      endDate: p.endDate,
      renewalStatus: p.renewalStatus as
        'PENDING' | 'REMINDED' | 'RENEWED' | 'NOT_RENEWED' | 'LAPSED',
      ...(p.vehicleNumber ? { vehicleNumber: p.vehicleNumber } : {}),
      ...(p.paymentLink ? { paymentLink: p.paymentLink } : {}),
      ...(p.referenceNote ? { referenceNote: p.referenceNote } : {}),
      ...(p.typeNote ? { typeNote: p.typeNote } : {}),
      ...(p.renewalNotice ? { renewalNotice: p.renewalNotice } : {}),
      ...(p.lastRemindedAt ? { lastRemindedAt: p.lastRemindedAt } : {}),
    });
    createdCount++;
  }

  console.log(`\nCreated ${String(createdCount)} new policies, skipped ${String(skippedCount)}.`);

  // ── Summary ──────────────────────────────────────────────
  const totalPolicies = await db.policy.count({ where: { agentId: agentUser.id } });
  const totalClients = await db.client.count({ where: { agentId: agentUser.id } });
  console.log(
    `Agent now has ${String(totalClients)} clients and ${String(totalPolicies)} policies.`,
  );

  const stats = {
    overdue: await db.policy.count({
      where: { agentId: agentUser.id, endDate: { lt: new Date() } },
    }),
    pending: await db.policy.count({ where: { agentId: agentUser.id, renewalStatus: 'PENDING' } }),
    reminded: await db.policy.count({
      where: { agentId: agentUser.id, renewalStatus: 'REMINDED' },
    }),
    renewed: await db.policy.count({ where: { agentId: agentUser.id, renewalStatus: 'RENEWED' } }),
    notRenewed: await db.policy.count({
      where: { agentId: agentUser.id, renewalStatus: 'NOT_RENEWED' },
    }),
    lapsed: await db.policy.count({ where: { agentId: agentUser.id, renewalStatus: 'LAPSED' } }),
  };
  console.log('Agent policy stats:', stats);

  // ── Enquiries ────────────────────────────────────────────
  const enquiriesData = [
    {
      name: 'Rajesh Varma',
      mobileNumber: '9876543210',
      policyType: 'MOTOR',
      referredBy: 'Friend',
      remindOn: daysFromNow(10),
      status: 'OPEN',
    },
    {
      name: 'Sunita Rao',
      mobileNumber: '9123456789',
      policyType: 'HEALTH',
      referredBy: 'Google Search',
      remindOn: daysFromNow(5),
      status: 'OPEN',
    },
    {
      name: 'Karan Malhotra',
      mobileNumber: '9988776655',
      policyType: 'FIRE',
      referredBy: 'Existing Customer',
      remindOn: null,
      status: 'DROPPED',
    },
    {
      name: 'Pooja Hegde',
      mobileNumber: '9876123456',
      policyType: 'MOTOR',
      referredBy: 'Walk-in',
      remindOn: daysAgo(2),
      status: 'CONVERTED',
    },
  ];

  let enquiriesCreated = 0;
  for (const e of enquiriesData) {
    const existing = await db.enquiry.findFirst({
      where: { name: e.name, agentId: agentUser.id },
    });
    if (!existing) {
      await createEnquiryWithHistory({
        agentId: agentUser.id,
        name: e.name,
        mobileNumber: e.mobileNumber,
        policyTypeId: getPolicyTypeId(policyTypesMap, e.policyType),
        referredBy: e.referredBy,
        remindOn: e.remindOn,
        status: e.status as 'OPEN' | 'CONVERTED' | 'DROPPED',
      });
      enquiriesCreated++;
    }
  }
  console.log(`Created ${String(enquiriesCreated)} new enquiries.`);

  console.log('--- Seeding Completed Successfully ---');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
