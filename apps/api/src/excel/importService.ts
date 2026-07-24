import * as XLSX from 'xlsx';
import type { PrismaClient } from '@prisma/client';
import { normaliseMobile, formatSmartClientName } from '@repo/utils';
import { VALIDATION, isAuthenticPolicyNumber } from '@repo/constants';

export interface RawRow {
  insuranceHolderName: string;
  mobileNumber: string | null;
  clientName: string | null;
  outsourceAgentName: string | null;
  outsourceAgentPhone: string | null;
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
  agentName: string | null;
  agentPhone: string | null;
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
  if (rawRows.length <= 1) return [];

  const headerRow = (rawRows[0] || []).map((h) => safeString(h).trim().toUpperCase());

  // Dynamic header locator with positional index fallback
  function findColIndex(possibleNames: string[], defaultIdx: number): number {
    for (let i = 0; i < headerRow.length; i++) {
      const colName = headerRow[i] || '';
      if (possibleNames.some((name) => colName.includes(name))) {
        return i;
      }
    }
    return defaultIdx;
  }

  const idxInsured = findColIndex(['INSURED', 'HOLDER', 'COVERED'], 0);
  const idxMobile = findColIndex(['MOBILE', 'PHONE', 'CONTACT'], 1);
  const idxAssociate = findColIndex(['ASSOCIATE', 'MAIN CLIENT'], 2);
  const idxAgentName = findColIndex(['OUTSOURCE AGENT NAME', 'AGENT NAME'], 3);
  const idxAgentPhone = findColIndex(['OUTSOURCE AGENT PHONE', 'OUTSOURCE AGENT MOBILE', 'AGENT PHONE', 'AGENT MOBILE'], 4);
  const idxPolicyType = findColIndex(['POLICY TYPE', 'TYPE'], 5);
  const idxVehicle = findColIndex(['VEHICLE'], 6);
  const idxPolicyNum = findColIndex(['POLICY NUMBER', 'POLICY NO'], 7);
  const idxEndDate = findColIndex(['END DATE', 'EXPIRY'], 8);
  const idxPremium = findColIndex(['PREMIUM'], 9);
  const idxRefNote = findColIndex(['REFERENCE', 'NOTE', 'REMARKS'], 10);

  const dataRows = rawRows.slice(1);
  const result: RawRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row: unknown[] | undefined = dataRows[i];
    if (!row || row.length === 0) continue;
    const nonEmpty = row.some((cell: unknown) => cell !== '' && cell != null);
    if (!nonEmpty) continue;

    const insuranceHolderName = safeString(row[idxInsured]).trim();
    const rawMobile = safeString(row[idxMobile]).trim();
    const rawClientName = safeString(row[idxAssociate]).trim();
    const rawAgentName = safeString(row[idxAgentName]).trim();
    const rawAgentPhone = safeString(row[idxAgentPhone]).trim();
    const policyTypeName = safeString(row[idxPolicyType]).trim();
    const rawVehicle = safeString(row[idxVehicle]).replace(/\s+/g, '');
    const rawPolicyNum = safeString(row[idxPolicyNum]).replace(/\s+/g, '');

    result.push({
      insuranceHolderName,
      mobileNumber: rawMobile || null,
      clientName: rawClientName || null,
      outsourceAgentName: rawAgentName || null,
      outsourceAgentPhone: rawAgentPhone || null,
      policyTypeName,
      vehicleNumber: rawVehicle.toUpperCase() === 'NEW' || rawVehicle === '' ? null : rawVehicle,
      policyNumber: rawPolicyNum === '' ? null : rawPolicyNum,
      endDate: row[idxEndDate],
      premiumPrice: safeNumber(row[idxPremium]),
      referenceNote: safeString(row[idxRefNote]).trim() || null,
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

  const slashMatch = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(str);
  if (slashMatch) {
    let day = parseInt(slashMatch[1]!, 10);
    let month = parseInt(slashMatch[2]!, 10);
    const year = parseInt(slashMatch[3]!, 10);

    if (month > 12 && day <= 12) {
      [day, month] = [month, day];
    }

    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    if (date.getUTCMonth() === month - 1 && date.getUTCDate() === day) return date;
  }

  const isoMatch = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/.exec(str);
  if (isoMatch) {
    const y = parseInt(isoMatch[1]!, 10);
    const m = parseInt(isoMatch[2]!, 10);
    const d = parseInt(isoMatch[3]!, 10);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

interface ValidatedRow {
  insuranceHolderName: string;
  mainClientName: string;
  isAssociatePolicy: boolean;
  agentName: string | null;
  agentPhone: string | null;
  mobileNumber: string | null;
  policyTypeName: string;
  vehicleNumber: string | null;
  policyNumber: string | null;
  renewalStatus: 'PENDING' | 'INACTIVE';
  premiumPrice: number | null;
  referenceNote: string | null;
  normalisedMobile: string | null;
  normalisedAgentMobile: string | null;
  parsedEndDate: Date | null;
  formattedEndDate: string;
  errors: string[];
}

function normalizeForNameMatch(name: string): string {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function validateRow(row: RawRow): ValidatedRow {
  const insuranceHolderName = formatSmartClientName(row.insuranceHolderName.trim());
  const rawClientName = row.clientName ? formatSmartClientName(row.clientName.trim()) : null;
  const agentName = row.outsourceAgentName ? formatSmartClientName(row.outsourceAgentName.trim()) : null;
  const agentPhone = row.outsourceAgentPhone ? row.outsourceAgentPhone.trim() : null;
  const mobileNumber = row.mobileNumber ? row.mobileNumber.trim() : null;
  const policyTypeName = row.policyTypeName.trim();
  const vehicleNumber = row.vehicleNumber ? row.vehicleNumber.trim() : null;
  const rawPolicyNumber = row.policyNumber ? row.policyNumber.trim() : null;
  const premiumPrice = row.premiumPrice;
  const referenceNote = row.referenceNote ? row.referenceNote.trim() : null;
  const rawEndDateStr = String(row.endDate).trim();

  const errors: string[] = [];

  // INSURED NAME (Required)
  if (!insuranceHolderName) {
    errors.push('INSURED NAME is required');
  } else if (!VALIDATION.NAME.test(insuranceHolderName)) {
    const invalidChars = Array.from(new Set(insuranceHolderName.match(/[^a-zA-Z0-9\s.'\/+_&()-]/g) ?? []));
    const charList = invalidChars.map((c) => `"${c}"`).join(', ');
    errors.push(`INSURED NAME "${insuranceHolderName}" contains invalid characters: ${charList}.`);
  }

  // ASSOCIATE NAME (Optional)
  if (rawClientName && !VALIDATION.NAME.test(rawClientName)) {
    const invalidChars = Array.from(new Set(rawClientName.match(/[^a-zA-Z0-9\s.'\/+_&()-]/g) ?? []));
    const charList = invalidChars.map((c) => `"${c}"`).join(', ');
    errors.push(`ASSOCIATE NAME "${rawClientName}" contains invalid characters: ${charList}.`);
  }

  // Self vs Associate evaluation
  const isAssociatePolicy = !!rawClientName && normalizeForNameMatch(rawClientName) !== normalizeForNameMatch(insuranceHolderName);
  const mainClientName = isAssociatePolicy ? rawClientName! : insuranceHolderName;

  // MOBILE NUMBER
  let normalisedMobile: string | null = null;
  if (!mobileNumber) {
    errors.push('MOBILE NUMBER is required');
  } else {
    const cleaned = normaliseMobile(mobileNumber);
    if (!cleaned || !/^\+91[6-9]\d{9}$/.test(cleaned)) {
      errors.push(`MOBILE NUMBER "${mobileNumber}" is invalid. Expected a 10-digit Indian mobile number starting with 6-9.`);
    } else {
      normalisedMobile = cleaned;
    }
  }

  // OUTSOURCE AGENT PHONE & NAME
  let normalisedAgentMobile: string | null = null;
  if (agentPhone) {
    const cleaned = normaliseMobile(agentPhone);
    if (!cleaned || !/^\+91[6-9]\d{9}$/.test(cleaned)) {
      errors.push(`OUTSOURCE AGENT PHONE NUMBER "${agentPhone}" is invalid. Expected a 10-digit Indian mobile number.`);
    } else {
      normalisedAgentMobile = cleaned;
    }
    if (!agentName) {
      errors.push('OUTSOURCE AGENT NAME is required when OUTSOURCE AGENT PHONE NUMBER is provided.');
    }
  } else if (agentName && !agentPhone) {
    errors.push('OUTSOURCE AGENT PHONE NUMBER is required when OUTSOURCE AGENT NAME is provided.');
  }

  // POLICY TYPE
  if (!policyTypeName) errors.push('POLICY TYPE is required');

  // VEHICLE NUMBER (optional)
  if (vehicleNumber && !VALIDATION.VEHICLE_NUMBER.test(vehicleNumber.toUpperCase())) {
    errors.push(`VEHICLE NUMBER "${vehicleNumber}" is invalid.`);
  }

  // POLICY NUMBER (optional / authentic check)
  const isAuthentic = !!rawPolicyNumber && isAuthenticPolicyNumber(rawPolicyNumber);
  const policyNumber = isAuthentic ? rawPolicyNumber : null;
  const renewalStatus: 'PENDING' | 'INACTIVE' = isAuthentic ? 'PENDING' : 'INACTIVE';

  // END DATE
  const parsedEndDate = parseDateValue(row.endDate);
  if (!parsedEndDate) {
    errors.push(`END DATE "${rawEndDateStr}" is not a valid date. Use DD/MM/YYYY format.`);
  }

  const formattedEndDate = parsedEndDate
    ? `${String(parsedEndDate.getDate()).padStart(2, '0')}/${String(parsedEndDate.getMonth() + 1).padStart(2, '0')}/${parsedEndDate.getFullYear()}`
    : rawEndDateStr;

  // PREMIUM PRICE (optional)
  if (premiumPrice !== null && (isNaN(premiumPrice) || premiumPrice < 0)) {
    errors.push(`PREMIUM PRICE "${String(row.premiumPrice)}" is invalid. Expected a positive number.`);
  }

  return {
    insuranceHolderName,
    mainClientName,
    isAssociatePolicy,
    agentName,
    agentPhone,
    mobileNumber,
    policyTypeName,
    vehicleNumber,
    policyNumber,
    renewalStatus,
    premiumPrice,
    referenceNote,
    normalisedMobile,
    normalisedAgentMobile,
    parsedEndDate,
    formattedEndDate,
    errors,
  };
}

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

  const seenPolicyNumbersInSheet = new Set<string>();
  const policyTypeCache = new Map<string, string>();
  const associateAgentCache = new Map<string, string>();

  async function processRow(row: RawRow): Promise<void> {
    const validated = validateRow(row);
    const {
      insuranceHolderName,
      mainClientName,
      isAssociatePolicy,
      agentName,
      agentPhone,
      mobileNumber,
      policyTypeName,
      vehicleNumber,
      policyNumber,
      premiumPrice,
      referenceNote,
      normalisedMobile,
      normalisedAgentMobile,
      parsedEndDate,
      formattedEndDate,
    } = validated;
    let { errors } = validated;

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
        clientName: insuranceHolderName,
        mobileNumber,
        associate: isAssociatePolicy ? mainClientName : null,
        agentName,
        agentPhone,
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
      const mobile = normalisedMobile!;
      const endDate = parsedEndDate!;

      const result = await db.$transaction(async (tx) => {
        // 1. Policy Type resolution
        const ptKey = policyTypeName.toLowerCase();
        let policyTypeId = policyTypeCache.get(ptKey);
        let rowCreatedPolicyType = false;

        if (!policyTypeId) {
          const existingPt = await tx.policyTypeMaster.findUnique({
            where: { name: policyTypeName },
            select: { id: true },
          });

          if (existingPt) {
            policyTypeId = existingPt.id;
          } else {
            const capitalized = policyTypeName.charAt(0).toUpperCase() + policyTypeName.slice(1);
            const newPt = await tx.policyTypeMaster.create({
              data: { name: capitalized },
              select: { id: true },
            });
            policyTypeId = newPt.id;
            rowCreatedPolicyType = true;
          }
          policyTypeCache.set(ptKey, policyTypeId);
        }

        // 2. Outsource Agent (Agent Master) resolution
        let subAgentId: string | null = null;
        let isOutsourced = false;
        if (normalisedAgentMobile && agentName) {
          isOutsourced = true;
          const agentKey = `${agentId}_${normalisedAgentMobile}`;
          subAgentId = associateAgentCache.get(agentKey) ?? null;

          if (!subAgentId) {
            const existingAgent = await tx.associateAgent.findFirst({
              where: { agentId, mobileNumber: normalisedAgentMobile },
              select: { id: true },
            });

            if (existingAgent) {
              subAgentId = existingAgent.id;
            } else {
              const newAgent = await tx.associateAgent.create({
                data: { agentId, name: agentName, mobileNumber: normalisedAgentMobile },
                select: { id: true },
              });
              subAgentId = newAgent.id;
            }
            associateAgentCache.set(agentKey, subAgentId);
          }
        }

        // 3. Main Client resolution
        let clientId: string;
        let rowCreatedClient = false;
        let rowMatchedClient = false;

        const existingClient = await tx.client.findFirst({
          where: { agentId, mobileNumber: mobile },
          select: { id: true, insuredName: true, isOutsourced: true, associateAgentId: true },
        });

        if (existingClient) {
          if (normalizeForNameMatch(existingClient.insuredName) !== normalizeForNameMatch(mainClientName)) {
            throw new Error(
              `Mobile number ${mobile} already belongs to main client "${existingClient.insuredName}". Cannot attach policy under "${mainClientName}".`,
            );
          }
          clientId = existingClient.id;
          rowMatchedClient = true;

          // If client exists but now has an outsource agent attached, update client flags
          if (isOutsourced && (!existingClient.isOutsourced || existingClient.associateAgentId !== subAgentId)) {
            await tx.client.update({
              where: { id: existingClient.id },
              data: { isOutsourced: true, associateAgentId: subAgentId },
            });
          }
        } else {
          // Create new Main Client
          const newClient = await tx.client.create({
            data: {
              insuredName: mainClientName,
              mobileNumber: mobile,
              agentId,
              isOutsourced,
              associateAgentId: subAgentId,
            },
            select: { id: true },
          });
          clientId = newClient.id;
          rowCreatedClient = true;
        }

        // 4. Duplicate Policy check
        if (policyNumber) {
          const existingPolicy = await tx.policy.findFirst({
            where: { agentId, policyNumber },
            select: { id: true },
          });
          if (existingPolicy) throw new Error('Policy Number already exists');
        } else {
          const existingPolicy = await tx.policy.findFirst({
            where: {
              agentId,
              clientId,
              policyTypeId,
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

        // 5. Create Policy
        const policy = await tx.policy.create({
          data: {
            agentId,
            clientId,
            policyTypeId,
            vehicleNumber: vehicleNumber ?? null,
            policyNumber: policyNumber ?? null,
            endDate,
            premiumPrice,
            referenceNote: referenceNote ?? null,
            renewalStatus: validated.renewalStatus,
            insuredPersonName: isAssociatePolicy ? insuranceHolderName : null,
            isOutsourced,
            associateAgentId: subAgentId,
          },
          select: { id: true },
        });

        // 6. Create Status History
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
          clientName: insuranceHolderName,
          mobileNumber,
          associate: isAssociatePolicy ? mainClientName : null,
          agentName,
          agentPhone,
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
          clientName: insuranceHolderName,
          mobileNumber,
          associate: isAssociatePolicy ? mainClientName : null,
          agentName,
          agentPhone,
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
      rowStatuses.push({
        rowNumber: row.rowNumber,
        clientName: insuranceHolderName,
        mobileNumber,
        associate: isAssociatePolicy ? mainClientName : null,
        agentName,
        agentPhone,
        policyTypeName,
        vehicleNumber,
        policyNumber,
        endDate: formattedEndDate,
        premiumPrice,
        referenceNote,
        status: 'FAILED',
        reason: err instanceof Error ? err.message : 'Unknown processing error',
      });
    }
  }

  // ─── Pass 1: Self Policies (Synchronous) ──────────────────────────────────
  const selfRows = rawRows.filter((r) => !validateRow(r).isAssociatePolicy);
  for (const row of selfRows) {
    await processRow(row);
  }

  // ─── Pass 2: Associate Policies (Synchronous) ─────────────────────────────
  const associateRows = rawRows.filter((r) => validateRow(r).isAssociatePolicy);
  for (const row of associateRows) {
    await processRow(row);
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

// ─── Dry-run Preview ──────────────────────────────────────────────────────────
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
  const policyTypeCache = new Map<string, string>();
  const associateAgentCache = new Map<string, string>();
  const wouldBeClients = new Map<string, { id: string; insuredName: string }>();

  async function processRow(row: RawRow): Promise<void> {
    const validated = validateRow(row);
    const {
      insuranceHolderName,
      mainClientName,
      isAssociatePolicy,
      agentName,
      agentPhone,
      mobileNumber,
      policyTypeName,
      vehicleNumber,
      policyNumber,
      premiumPrice,
      referenceNote,
      normalisedMobile,
      normalisedAgentMobile,
      parsedEndDate,
      formattedEndDate,
    } = validated;
    let { errors } = validated;

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
        clientName: insuranceHolderName,
        mobileNumber,
        associate: isAssociatePolicy ? mainClientName : null,
        agentName,
        agentPhone,
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
      const mobile = normalisedMobile!;
      const endDate = parsedEndDate!;

      // 1. Policy Type preview
      const ptKey = policyTypeName.toLowerCase();
      let policyTypeId = policyTypeCache.get(ptKey);
      let rowCreatedPolicyType = false;

      if (!policyTypeId) {
        const existingPt = await db.policyTypeMaster.findUnique({
          where: { name: policyTypeName },
          select: { id: true },
        });
        if (existingPt) {
          policyTypeId = existingPt.id;
        } else {
          policyTypeId = `preview-pt-${ptKey}`;
          rowCreatedPolicyType = true;
        }
        policyTypeCache.set(ptKey, policyTypeId);
      }

      // 2. Outsource Agent preview
      let subAgentId: string | null = null;
      if (normalisedAgentMobile && agentName) {
        const agentKey = `${agentId}_${normalisedAgentMobile}`;
        subAgentId = associateAgentCache.get(agentKey) ?? null;
        if (!subAgentId) {
          const existingAgent = await db.associateAgent.findFirst({
            where: { agentId, mobileNumber: normalisedAgentMobile },
            select: { id: true },
          });
          subAgentId = existingAgent ? existingAgent.id : `preview-agent-${normalisedAgentMobile}`;
          associateAgentCache.set(agentKey, subAgentId);
        }
      }

      // 3. Client resolution preview
      let clientId: string;
      let rowCreatedClient = false;
      let rowMatchedClient = false;

      const dbClient = await db.client.findFirst({
        where: { agentId, mobileNumber: mobile },
        select: { id: true, insuredName: true },
      });

      const effectiveClient = dbClient ?? wouldBeClients.get(mobile) ?? null;

      if (effectiveClient) {
        if (normalizeForNameMatch(effectiveClient.insuredName) !== normalizeForNameMatch(mainClientName)) {
          throw new Error(
            `Mobile number ${mobile} is registered to main client "${effectiveClient.insuredName}". Cannot attach policy under "${mainClientName}".`,
          );
        }
        clientId = effectiveClient.id;
        rowMatchedClient = true;
      } else {
        const fakeId = `preview-client-${mobile}`;
        wouldBeClients.set(mobile, { id: fakeId, insuredName: mainClientName });
        clientId = fakeId;
        rowCreatedClient = true;
      }

      // 4. Duplicate policy check
      if (policyNumber) {
        const existingPolicy = await db.policy.findFirst({
          where: { agentId, policyNumber },
          select: { id: true },
        });
        if (existingPolicy) throw new Error('Policy Number already exists');
      } else if (dbClient && !policyTypeId.startsWith('preview-')) {
        const existingPolicy = await db.policy.findFirst({
          where: {
            agentId,
            clientId,
            policyTypeId,
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
            clientName: insuranceHolderName,
            mobileNumber,
            associate: isAssociatePolicy ? mainClientName : null,
            agentName,
            agentPhone,
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

      successCount++;
      createdPolicies++;
      if (rowCreatedClient) createdClients++;
      if (rowMatchedClient) matchedClients++;
      if (rowCreatedPolicyType) createdPolicyTypes++;

      rowStatuses.push({
        rowNumber: row.rowNumber,
        clientName: insuranceHolderName,
        mobileNumber,
        associate: isAssociatePolicy ? mainClientName : null,
        agentName,
        agentPhone,
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
      rowStatuses.push({
        rowNumber: row.rowNumber,
        clientName: insuranceHolderName,
        mobileNumber,
        associate: isAssociatePolicy ? mainClientName : null,
        agentName,
        agentPhone,
        policyTypeName,
        vehicleNumber,
        policyNumber,
        endDate: formattedEndDate,
        premiumPrice,
        referenceNote,
        status: 'FAILED',
        reason: err instanceof Error ? err.message : 'Unknown processing error',
      });
    }
  }

  // Pass 1: Self Policies
  const selfRows = rawRows.filter((r) => !validateRow(r).isAssociatePolicy);
  for (const row of selfRows) {
    await processRow(row);
  }

  // Pass 2: Associate Policies
  const associateRows = rawRows.filter((r) => validateRow(r).isAssociatePolicy);
  for (const row of associateRows) {
    await processRow(row);
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
