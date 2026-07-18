import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`),
});
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

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

/** Ensure all phone numbers include the country code prefix */
async function normalizeNumbers() {
  console.log('\n--- Normalizing phone number formats ---');

  // Normalize enquiries: prepend default country code to bare 10-digit numbers
  const enquiriesUpdated = await db.$executeRaw`
    UPDATE enquiries e
    INNER JOIN settings s ON e.agent_id = s.agent_id
    SET e.mobile_number = CONCAT(s.default_country_code, e.mobile_number)
    WHERE e.mobile_number NOT LIKE '+%'
      AND e.mobile_number REGEXP '^[0-9]{10}$'
  `;
  console.log(`  Enquiries normalized: ${enquiriesUpdated}`);

  // Normalize clients: prepend default country code to bare 10-digit numbers
  const clientsUpdated = await db.$executeRaw`
    UPDATE clients c
    INNER JOIN settings s ON c.agent_id = s.agent_id
    SET c.mobile_number = CONCAT(s.default_country_code, c.mobile_number)
    WHERE c.mobile_number IS NOT NULL
      AND c.mobile_number NOT LIKE '+%'
      AND c.mobile_number REGEXP '^[0-9]{10}$'
  `;
  console.log(`  Clients normalized: ${clientsUpdated}`);

  return enquiriesUpdated + clientsUpdated;
}

async function deduplicateClients() {
  console.log('\n--- Clients ---');

  const duplicates = await db.$queryRaw<
    Array<{ agent_id: string; mobile_number: string; cnt: bigint }>
  >`
    SELECT agent_id, mobile_number, COUNT(*) as cnt
    FROM clients
    WHERE mobile_number IS NOT NULL AND mobile_number != ''
    GROUP BY agent_id, mobile_number
    HAVING cnt > 1
  `;

  if (duplicates.length === 0) {
    console.log('No duplicate client mobile numbers found.');
    return 0;
  }

  let total = 0;
  for (const dup of duplicates) {
    const { agent_id, mobile_number } = dup;
    const clients = await db.client.findMany({
      where: { agentId: agent_id, mobileNumber: mobile_number },
      orderBy: { createdAt: 'asc' },
      select: { id: true, insuredName: true },
    });

    const [, ...toNullify] = clients;
    for (const c of toNullify) {
      await db.client.update({
        where: { id: c.id },
        data: { mobileNumber: '+910000000000' },
      });
      total++;
    }
    console.log(`  ${mobile_number}: kept oldest, nullified ${toNullify.length} duplicate(s)`);
  }
  console.log(`  Total: ${total} client(s) updated`);
  return total;
}

async function deduplicateEnquiries() {
  console.log('\n--- Enquiries ---');

  const duplicates = await db.$queryRaw<
    Array<{ agent_id: string; mobile_number: string; cnt: bigint }>
  >`
    SELECT agent_id, mobile_number, COUNT(*) as cnt
    FROM enquiries
    WHERE mobile_number IS NOT NULL AND mobile_number != ''
    GROUP BY agent_id, mobile_number
    HAVING cnt > 1
  `;

  if (duplicates.length === 0) {
    console.log('No duplicate enquiry mobile numbers found.');
    return 0;
  }

  let total = 0;
  for (const dup of duplicates) {
    const { agent_id, mobile_number } = dup;
    const enquiries = await db.enquiry.findMany({
      where: { agentId: agent_id, mobileNumber: mobile_number },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true },
    });

    const [, ...toDelete] = enquiries;
    for (const e of toDelete) {
      await db.enquiry.delete({ where: { id: e.id } });
      total++;
    }
    console.log(`  ${mobile_number}: kept newest, deleted ${toDelete.length} duplicate(s)`);
  }
  console.log(`  Total: ${total} enquiry(ies) deleted`);
  return total;
}

async function deduplicateCrossTable() {
  console.log('\n--- Cross-table (enquiry vs client) ---');

  const duplicates = await db.$queryRaw<
    Array<{ agent_id: string; mobile_number: string; enquiry_name: string; client_name: string }>
  >`
    SELECT e.agent_id, e.mobile_number, e.name AS enquiry_name, c.insured_name AS client_name
    FROM enquiries e
    INNER JOIN clients c ON e.agent_id = c.agent_id AND e.mobile_number = c.mobile_number
    WHERE e.mobile_number IS NOT NULL AND e.mobile_number != ''
  `;

  if (duplicates.length === 0) {
    console.log('No cross-table duplicates found.');
    return 0;
  }

  let total = 0;
  for (const dup of duplicates) {
    const { agent_id, mobile_number, enquiry_name, client_name } = dup;
    const enquiry = await db.enquiry.findFirst({
      where: { agentId: agent_id, mobileNumber: mobile_number },
      select: { id: true, name: true },
    });
    if (enquiry) {
      await db.enquiry.delete({ where: { id: enquiry.id } });
      console.log(
        `  ${mobile_number}: deleted enquiry "${enquiry_name}" (client "${client_name}" already exists)`,
      );
      total++;
    }
  }
  console.log(`  Total: ${total} enquiry(ies) deleted`);
  return total;
}

async function main() {
  console.log('--- Deduplicating mobile numbers ---');
  const normalized = await normalizeNumbers();
  const clientCount = await deduplicateClients();
  const enquiryCount = await deduplicateEnquiries();
  const crossCount = await deduplicateCrossTable();
  console.log(
    `\n--- Done. Normalized ${normalized}, ${clientCount} client(s), ${enquiryCount} enquiry(ies), ${crossCount} cross-table deleted. ---`,
  );
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
