import * as XLSX from 'xlsx';
import type { PrismaClient } from '@prisma/client';
import { normaliseMobile, formatSmartClientName } from '@repo/utils';
import { VALIDATION, isAuthenticPolicyNumber } from '@repo/constants';

export interface RawRow {
  clientName: string;
  mobileNumber: string | null;
  associate: string | null;
  policyTypeName: string;
  vehicleNumber: string | null;
  policyNumber: string | null;
  endDate: unknown;
  premiumPrice: number | null;
  referenceNote: string | null;
  rowNumber: number;
}

export interface RowProcessStatus {
  rowNumber: number;
  clientName: string;
  mobileNumber: string | null;
  associate: string | null;
  policyTypeName: string;
  vehicleNumber: string | null;
  policyNumber: string | null;
  endDate: string;
  premiumPrice: number | null;
  referenceNote: string | null;
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
  reason: string | null;
}

export interface ImportResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  createdClients: number;
  matchedClients: number;
  createdPolicies: number;
  createdPolicyTypes: number;
  rowStatuses: RowProcessStatus[];
}

function safeString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  return '';
}

function safeNumber(value: unknown): number | null {
  if (value === '' || value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value.trim());
    return isNaN(n) ? null : n;
  }
  return null;
}



export function parseExcel(buffer: Buffer): RawRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer', raw: false, cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];

  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const dataRows = rawRows.slice(1);
  const result: RawRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row: unknown[] | undefined = dataRows[i];
    if (!row || row.length === 0) continue;
    const nonEmpty = row.some((cell: unknown) => cell !== '' && cell != null);
    if (!nonEmpty) continue;

    const rawMobile = safeString(row[1]).trim();
    const rawAssociate = safeString(row[2]).trim();

    result.push({
      clientName: safeString(row[0]).trim(),
      mobileNumber: rawMobile || null,
      associate: rawAssociate || null,
      policyTypeName: safeString(row[3]).trim(),
      vehicleNumber: (() => {
        const val = safeString(row[4]).replace(/\s+/g, '');
        return val.toUpperCase() === 'NEW' || val === '' ? null : val;
      })(),
      policyNumber: (() => {
        const val = safeString(row[5]).replace(/\s+/g, '');
        return val === '' ? null : val;
      })(),
      endDate: row[6],
      premiumPrice: safeNumber(row[7]),
      referenceNote: safeString(row[8]).trim() || null,
      rowNumber: i + 2,
    });
  }

  return result;
}

function parseDateValue(value: unknown): Date | null {
  if (value == null || value === '') return null;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 12, 0, 0));
  }

  if (typeof value === 'number') {
    if (value < 1 || value > 200000) return null;
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (isNaN(d.getTime())) return null;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
  }

  if (typeof value !== 'string') return null;

  const str = value.trim();
  if (!str) return null;

  const slashRe = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;
  const slashMatch = slashRe.exec(str);
  if (slashMatch) {
    const first = slashMatch[1];
    const second = slashMatch[2];
    const third = slashMatch[3];
    if (!first || !second || !third) return null;
    let day = parseInt(first, 10);
    let month = parseInt(second, 10);
    const year = parseInt(third, 10);

    if (day > 12 && month <= 12) {
      // day is first
    } else if (month > 12 && day <= 12) {
      [day, month] = [month, day];
    }

    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    if (date.getUTCMonth() === month - 1 && date.getUTCDate() === day) return date;
  }

  const isoRe = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/;
  const isoMatch = isoRe.exec(str);
  if (isoMatch) {
    const yearStr = isoMatch[1];
    const monthStr = isoMatch[2];
    const dayStr = isoMatch[3];
    if (!yearStr || !monthStr || !dayStr) return null;
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    const d = parseInt(dayStr, 10);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

// ─── Validated row shape returned by validateRow ─────────────────────────────

interface ValidatedRow {
  clientName: string;
  associate: string | null;
  mobileNumber: string | null;
  policyTypeName: string;
  vehicleNumber: string | null;
  policyNumber: string | null;
  renewalStatus: 'PENDING' | 'INACTIVE';
  premiumPrice: number | null;
  referenceNote: string | null;
  normalisedMobile: string | null;
  parsedEndDate: Date | null;
  formattedEndDate: string;
  errors: string[];
}

function normalizeForNameMatch(name: string): string {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function validateRow(row: RawRow): ValidatedRow {
  const clientName = formatSmartClientName(row.clientName.trim());
  const associate = row.associate ? formatSmartClientName(row.associate.trim()) : null;
  const mobileNumber = row.mobileNumber ? row.mobileNumber.trim() : null;
  const policyTypeName = row.policyTypeName.trim();
  const vehicleNumber = row.vehicleNumber ? row.vehicleNumber.trim() : null;
  const rawPolicyNumber = row.policyNumber ? row.policyNumber.trim() : null;
  const premiumPrice = row.premiumPrice;
  const referenceNote = row.referenceNote ? row.referenceNote.trim() : null;
  const rawEndDateStr = String(row.endDate).trim();

  const errors: string[] = [];

  // CLIENT NAME
  if (!clientName) {
    errors.push('CLIENT NAME is required');
  } else {
    if (!VALIDATION.NAME.test(clientName)) {
      const invalidChars = Array.from(new Set(clientName.match(/[^a-zA-Z0-9\s.'\/+_&()-]/g) ?? []));
      const charList = invalidChars.map((c) => `"${c}"`).join(', ');
      errors.push(
        `CLIENT NAME "${clientName}" contains invalid characters: ${charList}.`,
      );
    }
  }

  // ASSOCIATE NAME (optional)
  if (associate && !VALIDATION.NAME.test(associate)) {
    const invalidChars = Array.from(new Set(associate.match(/[^a-zA-Z0-9\s.'\/+_&()-]/g) ?? []));
    const charList = invalidChars.map((c) => `"${c}"`).join(', ');
    errors.push(`ASSOCIATE NAME "${associate}" contains invalid characters: ${charList}.`);
  }

  // MOBILE NUMBER
  let normalisedMobile: string | null = null;
  if (!mobileNumber) {
    errors.push('MOBILE NUMBER is required');
  } else {
    const cleaned = normaliseMobile(mobileNumber);
    if (!cleaned || !/^\+91[6-9]\d{9}$/.test(cleaned)) {
      errors.push(
        `MOBILE NUMBER "${mobileNumber}" is invalid. Expected a 10-digit Indian mobile number (optionally with +91 prefix) starting with 6-9`,
      );
    } else {
      normalisedMobile = cleaned;
    }
  }

  // POLICY TYPE
  if (!policyTypeName) {
    errors.push('POLICY TYPE is required');
  }

  // VEHICLE NUMBER (optional)
  if (vehicleNumber) {
    const upperVehicle = vehicleNumber.toUpperCase();
    if (!VALIDATION.VEHICLE_NUMBER.test(upperVehicle)) {
      errors.push(
        `VEHICLE NUMBER "${vehicleNumber}" is invalid. Expected format like MH12AB1234 (2 letters state code, 1-2 digits RTO code, 1-2 letters series, and 1-4 digits unique code)`,
      );
    }
  }

  // POLICY NUMBER (optional / authentic check)
  // If policy number is missing or is not an authentic policy number (e.g. random text, status words),
  // save policy with no policy number (null) and status INACTIVE.
  const isAuthentic = !!rawPolicyNumber && isAuthenticPolicyNumber(rawPolicyNumber);
  const policyNumber = isAuthentic ? rawPolicyNumber : null;
  const renewalStatus: 'PENDING' | 'INACTIVE' = isAuthentic ? 'PENDING' : 'INACTIVE';

  // END DATE
  const parsedEndDate = parseDateValue(row.endDate);
  if (!parsedEndDate) {
    errors.push(`END DATE "${rawEndDateStr}" is not a valid date. Use DD/MM/YYYY format`);
  }

  const formattedEndDate = parsedEndDate
    ? `${String(parsedEndDate.getDate()).padStart(2, '0')}/${String(
        parsedEndDate.getMonth() + 1,
      ).padStart(2, '0')}/${String(parsedEndDate.getFullYear())}`
    : rawEndDateStr;

  // PREMIUM PRICE (optional)
  if (premiumPrice !== null && (isNaN(premiumPrice) || premiumPrice < 0)) {
    errors.push(
      `PREMIUM PRICE "${String(row.premiumPrice)}" is invalid. Expected a positive number`,
    );
  }

  return {
    clientName,
    associate,
    mobileNumber,
    policyTypeName,
    vehicleNumber,
    policyNumber,
    renewalStatus,
    premiumPrice,
    referenceNote,
    normalisedMobile,
    parsedEndDate,
    formattedEndDate,
    errors,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function processBulkImport(
  agentId: string,
  rawRows: RawRow[],
  db: PrismaClient,
): Promise<ImportResult> {
  let successCount = 0;
  let failedCount = 0;
  let duplicateCount = 0;
  let createdClients = 0;
  let matchedClients = 0;
  let createdPolicies = 0;
  let createdPolicyTypes = 0;
  const rowStatuses: RowProcessStatus[] = [];

  // Shared state across both passes
  const seenPolicyNumbersInSheet = new Set<string>();
  const policyTypeCache = new Map<string, string>();

  // ─── Per-row processor ────────────────────────────────────────────────────
  // isAssociatePass = false → primary client rows (associate column is empty)
  // isAssociatePass = true  → associate rows (associate column has a value)
  async function processRow(row: RawRow, isAssociatePass: boolean): Promise<void> {
    const validated = validateRow(row);
    const {
      clientName,
      associate,
      mobileNumber,
      policyTypeName,
      vehicleNumber,
      policyNumber,
      premiumPrice,
      referenceNote,
      normalisedMobile,
      parsedEndDate,
      formattedEndDate,
    } = validated;
    let { errors } = validated;

    // Sheet-level duplicate policy numbers — tracked across both passes
    if (policyNumber && errors.length === 0) {
      const upperPolicyNumber = policyNumber.toUpperCase();
      if (seenPolicyNumbersInSheet.has(upperPolicyNumber)) {
        errors = [...errors, 'Policy number is duplicated within the uploaded file'];
      } else {
        seenPolicyNumbersInSheet.add(upperPolicyNumber);
      }
    }

    if (errors.length > 0) {
      failedCount++;
      rowStatuses.push({
        rowNumber: row.rowNumber,
        clientName,
        mobileNumber,
        associate,
        policyTypeName,
        vehicleNumber,
        policyNumber,
        endDate: formattedEndDate,
        premiumPrice,
        referenceNote,
        status: 'FAILED',
        reason: errors.join('; '),
      });
      return;
    }

    // Business Constraints Validation and Processing (Transactional)
    try {
      const mobile = normalisedMobile;
      const endDate = parsedEndDate;

      if (!mobile) throw new Error('MOBILE NUMBER is required');
      if (!endDate) throw new Error('END DATE is required');

      const result = await db.$transaction(async (tx) => {
        // 1. Policy Type lookup or creation
        const ptCacheKey = policyTypeName.toLowerCase();
        let policyTypeId = policyTypeCache.get(ptCacheKey);
        let rowCreatedPolicyType = false;

        if (!policyTypeId) {
          const existingPt = await tx.policyTypeMaster.findUnique({
            where: { name: policyTypeName },
            select: { id: true },
          });

          if (existingPt) {
            policyTypeId = existingPt.id;
            policyTypeCache.set(ptCacheKey, policyTypeId);
          } else {
            const capitalizedName =
              policyTypeName.charAt(0).toUpperCase() + policyTypeName.slice(1);
            const newPt = await tx.policyTypeMaster.create({
              data: { name: capitalizedName },
              select: { id: true },
            });
            policyTypeId = newPt.id;
            policyTypeCache.set(ptCacheKey, policyTypeId);
            rowCreatedPolicyType = true;
          }
        }

        const currentPolicyTypeId = policyTypeId;
        if (!currentPolicyTypeId) throw new Error('POLICY TYPE ID is missing');

        // 2. Client resolution — behaviour differs per pass
        let clientId: string;
        let rowCreatedClient = false;
        let rowMatchedClient = false;

        const existingClient = await tx.client.findFirst({
          where: { agentId, mobileNumber: mobile },
          select: { id: true, insuredName: true },
        });

        if (isAssociatePass) {
          // ── Pass 2: associate rows ───────────────────────────────────────
          // The primary client MUST exist in DB by now (created in Pass 1 or
          // pre-existing). Validate that the associate column matches the
          // registered holder's name, then link this policy to that client.
          if (!existingClient) {
            throw new Error(
              `No primary client found for mobile number ${mobile}. Ensure the file contains a row without an Associate value for this mobile number`,
            );
          }
          const holderKey = normalizeForNameMatch(existingClient.insuredName);
          const associateKey = row.associate ? normalizeForNameMatch(row.associate) : '';
          if (associateKey !== holderKey) {
            throw new Error(
              `Associate "${row.associate ?? ''}" does not match the registered holder "${existingClient.insuredName}" for this mobile number`,
            );
          }
          // Valid associate → link policy to primary client
          clientId = existingClient.id;
          rowMatchedClient = true;
        } else {
          // ── Pass 1: primary rows ─────────────────────────────────────────
          if (existingClient) {
            if (normalizeForNameMatch(existingClient.insuredName) !== normalizeForNameMatch(clientName)) {
              throw new Error(
                `Mobile number already belongs to "${existingClient.insuredName}". If this is a family/associated policy, fill in the Associate column with "${existingClient.insuredName}"`,
              );
            }
            clientId = existingClient.id;
            rowMatchedClient = true;
          } else {
            const newClient = await tx.client.create({
              data: { insuredName: clientName, mobileNumber: mobile, agentId },
              select: { id: true },
            });
            clientId = newClient.id;
            rowCreatedClient = true;
          }
        }

        // 3. Policy unique constraint check
        if (policyNumber) {
          const existingPolicy = await tx.policy.findFirst({
            where: { agentId, policyNumber },
            select: { id: true },
          });
          if (existingPolicy) throw new Error('Policy Number already exists');
        } else {
          // 4. Duplicate policy check (idempotency) when policyNumber is not present
          const existingPolicy = await tx.policy.findFirst({
            where: {
              agentId,
              clientId,
              policyTypeId: currentPolicyTypeId,
              endDate,
              vehicleNumber: vehicleNumber ? vehicleNumber.toUpperCase() : null,
              premiumPrice,
            },
            select: { id: true },
          });
          if (existingPolicy) {
            return { isDuplicate: true, rowCreatedClient, rowMatchedClient, rowCreatedPolicyType };
          }
        }

        // 5. Create policy
        // insuredPersonName is always the CLIENT NAME from this row — the actual insured person.
        // For associate rows this is e.g. "MUKESH KUMAR JAIN"; for primary rows it is the main holder's name.
        const policy = await tx.policy.create({
          data: {
            agentId,
            clientId,
            policyTypeId: currentPolicyTypeId,
            vehicleNumber: vehicleNumber ?? null,
            policyNumber: policyNumber ?? null,
            endDate,
            premiumPrice,
            referenceNote: referenceNote ?? null,
            renewalStatus: validated.renewalStatus,
            insuredPersonName: clientName,
          },
          select: { id: true },
        });

        // 6. Create status history
        await tx.policyStatusHistory.create({
          data: {
            policyId: policy.id,
            previousStatus: null,
            newStatus: validated.renewalStatus,
            changedById: agentId,
          },
        });

        return { isDuplicate: false, rowCreatedClient, rowMatchedClient, rowCreatedPolicyType };
      });

      if (result.isDuplicate) {
        duplicateCount++;
        if (result.rowCreatedClient) createdClients++;
        if (result.rowMatchedClient) matchedClients++;
        if (result.rowCreatedPolicyType) createdPolicyTypes++;

        rowStatuses.push({
          rowNumber: row.rowNumber,
          clientName,
          mobileNumber,
          associate,
          policyTypeName,
          vehicleNumber,
          policyNumber,
          endDate: formattedEndDate,
          premiumPrice,
          referenceNote,
          status: 'SKIPPED',
          reason: 'Policy already exists in the system',
        });
      } else {
        successCount++;
        createdPolicies++;
        if (result.rowCreatedClient) createdClients++;
        if (result.rowMatchedClient) matchedClients++;
        if (result.rowCreatedPolicyType) createdPolicyTypes++;

        rowStatuses.push({
          rowNumber: row.rowNumber,
          clientName,
          mobileNumber,
          associate,
          policyTypeName,
          vehicleNumber,
          policyNumber,
          endDate: formattedEndDate,
          premiumPrice,
          referenceNote,
          status: 'SUCCESS',
          reason: null,
        });
      }
    } catch (err: unknown) {
      failedCount++;
      const errorMessage = err instanceof Error ? err.message : 'Unknown processing error';
      rowStatuses.push({
        rowNumber: row.rowNumber,
        clientName,
        mobileNumber,
        associate,
        policyTypeName,
        vehicleNumber,
        policyNumber,
        endDate: formattedEndDate,
        premiumPrice,
        referenceNote,
        status: 'FAILED',
        reason: errorMessage,
      });
    }
  }

  // ─── Pass 1: Primary rows (associate column is empty) ────────────────────────
  // Creates or matches the primary client record for each mobile number.
  // These are processed first so that primary clients exist in the DB before
  // Pass 2 tries to link associate policies to them.
  const primaryRows = rawRows.filter((r) => !r.associate);
  for (const row of primaryRows) {
    await processRow(row, false);
  }

  // ─── Pass 2: Associate rows (associate column has a value) ───────────────────
  // By this point all primary clients from this batch are in the DB.
  // Links each associate policy to its primary client and sets insuredPersonName
  // to this row's own clientName (e.g. "MUKESH KUMAR JAIN").
  const associateRows = rawRows.filter((r) => !!r.associate);
  for (const row of associateRows) {
    await processRow(row, true);
  }

  // Re-sort rowStatuses by original row number so the report matches upload order.
  rowStatuses.sort((a, b) => a.rowNumber - b.rowNumber);

  return {
    totalRows: rawRows.length,
    successCount,
    failedCount,
    duplicateCount,
    createdClients,
    matchedClients,
    createdPolicies,
    createdPolicyTypes,
    rowStatuses,
  };
}

// ─── Preview / Dry-run ────────────────────────────────────────────────────────
// Runs identical validation to processBulkImport but never writes to the DB.
// Uses in-memory maps to simulate client/policy-type creation across the two
// passes so that associate rows can be correctly validated even when the primary
// client doesn't yet exist in the database.
export async function previewBulkImport(
  agentId: string,
  rawRows: RawRow[],
  db: PrismaClient,
): Promise<ImportResult> {
  let successCount = 0;
  let failedCount = 0;
  let duplicateCount = 0;
  let createdClients = 0;
  let matchedClients = 0;
  let createdPolicies = 0;
  let createdPolicyTypes = 0;
  const rowStatuses: RowProcessStatus[] = [];

  const seenPolicyNumbersInSheet = new Set<string>();
  // Real DB id OR a preview-scoped fake id (prefix "preview-pt-")
  const policyTypeCache = new Map<string, string>();
  // Clients that would be created by Pass 1 primary rows.
  // Key = normalised mobile. Value = { id: "preview-client-<mobile>", insuredName }
  const wouldBeClients = new Map<string, { id: string; insuredName: string }>();

  async function processRow(row: RawRow, isAssociatePass: boolean): Promise<void> {
    const validated = validateRow(row);
    const {
      clientName,
      associate,
      mobileNumber,
      policyTypeName,
      vehicleNumber,
      policyNumber,
      premiumPrice,
      referenceNote,
      normalisedMobile,
      parsedEndDate,
      formattedEndDate,
    } = validated;
    let { errors } = validated;

    // Sheet-level duplicate policy numbers
    if (policyNumber && errors.length === 0) {
      const upper = policyNumber.toUpperCase();
      if (seenPolicyNumbersInSheet.has(upper)) {
        errors = [...errors, 'Policy number is duplicated within the uploaded file'];
      } else {
        seenPolicyNumbersInSheet.add(upper);
      }
    }

    if (errors.length > 0) {
      failedCount++;
      rowStatuses.push({
        rowNumber: row.rowNumber,
        clientName,
        mobileNumber,
        associate,
        policyTypeName,
        vehicleNumber,
        policyNumber,
        endDate: formattedEndDate,
        premiumPrice,
        referenceNote,
        status: 'FAILED',
        reason: errors.join('; '),
      });
      return;
    }

    try {
      const mobile = normalisedMobile;
      const endDate = parsedEndDate;
      if (!mobile) throw new Error('MOBILE NUMBER is required');
      if (!endDate) throw new Error('END DATE is required');

      // 1. Policy Type — check DB, then simulate creation with a preview-scoped id
      const ptCacheKey = policyTypeName.toLowerCase();
      let policyTypeId = policyTypeCache.get(ptCacheKey);
      let rowCreatedPolicyType = false;

      if (!policyTypeId) {
        const existingPt = await db.policyTypeMaster.findUnique({
          where: { name: policyTypeName },
          select: { id: true },
        });
        if (existingPt) {
          policyTypeId = existingPt.id;
          policyTypeCache.set(ptCacheKey, policyTypeId);
        } else {
          // Would be created
          const fakeId = `preview-pt-${ptCacheKey}`;
          policyTypeId = fakeId;
          policyTypeCache.set(ptCacheKey, fakeId);
          rowCreatedPolicyType = true;
        }
      }

      const currentPolicyTypeId = policyTypeId;
      if (!currentPolicyTypeId) throw new Error('POLICY TYPE ID is missing');

      // 2. Client resolution (no writes)
      let clientId: string;
      let rowCreatedClient = false;
      let rowMatchedClient = false;
      const dbClient = await db.client.findFirst({
        where: { agentId, mobileNumber: mobile },
        select: { id: true, insuredName: true },
      });

      if (isAssociatePass) {
        // ── Pass 2: associate rows ─────────────────────────────────────────
        // Accept client from DB *or* from the in-memory would-be-created map
        const effectiveClient = dbClient ?? wouldBeClients.get(mobile) ?? null;

        if (!effectiveClient) {
          throw new Error(
            `No primary client found for mobile number ${mobile}. Ensure the file contains a row without an Associate value for this mobile number`,
          );
        }
        const holderKey = normalizeForNameMatch(effectiveClient.insuredName);
        const associateKey = associate ? normalizeForNameMatch(associate) : (row.associate ? normalizeForNameMatch(row.associate) : '');
        if (associateKey !== holderKey) {
          throw new Error(
            `Associate "${row.associate ?? ''}" does not match the registered holder "${effectiveClient.insuredName}" for this mobile number`,
          );
        }
        clientId = effectiveClient.id;
        rowMatchedClient = true;
      } else {
        // ── Pass 1: primary rows ───────────────────────────────────────────
        if (dbClient) {
          if (normalizeForNameMatch(dbClient.insuredName) !== normalizeForNameMatch(clientName)) {
            throw new Error(
              `Mobile number already belongs to "${dbClient.insuredName}". If this is a family/associated policy, fill in the Associate column with "${dbClient.insuredName}"`,
            );
          }
          clientId = dbClient.id;
          rowMatchedClient = true;
        } else {
          // Would be created — store in-memory so Pass 2 can reference it
          const fakeId = `preview-client-${mobile}`;
          wouldBeClients.set(mobile, { id: fakeId, insuredName: clientName });
          clientId = fakeId;
          rowCreatedClient = true;
        }
      }

      // 3. Policy number uniqueness check (DB read only)
      if (policyNumber) {
        const existingPolicy = await db.policy.findFirst({
          where: { agentId, policyNumber },
          select: { id: true },
        });
        if (existingPolicy) throw new Error('Policy Number already exists');
      } else if (dbClient && !currentPolicyTypeId.startsWith('preview-')) {
        // 4. Duplicate policy check — only possible when both client and policy type are real DB records
        const existingPolicy = await db.policy.findFirst({
          where: {
            agentId,
            clientId,
            policyTypeId: currentPolicyTypeId,
            endDate,
            vehicleNumber: vehicleNumber ? vehicleNumber.toUpperCase() : null,
            premiumPrice,
          },
          select: { id: true },
        });
        if (existingPolicy) {
          duplicateCount++;
          if (rowCreatedClient) createdClients++;
          if (rowMatchedClient) matchedClients++;
          if (rowCreatedPolicyType) createdPolicyTypes++;
          rowStatuses.push({
            rowNumber: row.rowNumber,
            clientName,
            mobileNumber,
            associate,
            policyTypeName,
            vehicleNumber,
            policyNumber,
            endDate: formattedEndDate,
            premiumPrice,
            referenceNote,
            status: 'SKIPPED',
            reason: 'Policy already exists in the system',
          });
          return;
        }
      }

      // Would be created successfully
      successCount++;
      createdPolicies++;
      if (rowCreatedClient) createdClients++;
      if (rowMatchedClient) matchedClients++;
      if (rowCreatedPolicyType) createdPolicyTypes++;
      rowStatuses.push({
        rowNumber: row.rowNumber,
        clientName,
        mobileNumber,
        associate,
        policyTypeName,
        vehicleNumber,
        policyNumber,
        endDate: formattedEndDate,
        premiumPrice,
        referenceNote,
        status: 'SUCCESS',
        reason: null,
      });
    } catch (err: unknown) {
      failedCount++;
      const errorMessage = err instanceof Error ? err.message : 'Unknown processing error';
      rowStatuses.push({
        rowNumber: row.rowNumber,
        clientName,
        mobileNumber,
        associate,
        policyTypeName,
        vehicleNumber,
        policyNumber,
        endDate: formattedEndDate,
        premiumPrice,
        referenceNote,
        status: 'FAILED',
        reason: errorMessage,
      });
    }
  }

  // Pass 1: primary rows (no associate)
  const primaryRows = rawRows.filter((r) => !r.associate);
  for (const row of primaryRows) {
    await processRow(row, false);
  }

  // Pass 2: associate rows
  const associateRows = rawRows.filter((r) => !!r.associate);
  for (const row of associateRows) {
    await processRow(row, true);
  }

  rowStatuses.sort((a, b) => a.rowNumber - b.rowNumber);

  return {
    totalRows: rawRows.length,
    successCount,
    failedCount,
    duplicateCount,
    createdClients,
    matchedClients,
    createdPolicies,
    createdPolicyTypes,
    rowStatuses,
  };
}
