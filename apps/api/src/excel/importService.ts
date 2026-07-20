import * as XLSX from 'xlsx';
import type { PrismaClient } from '@prisma/client';
import { normaliseMobile } from '@repo/utils';
import { VALIDATION } from '@repo/constants';

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

  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  if (typeof value === 'number') {
    if (value < 1 || value > 200000) return null;
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
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
    let a = parseInt(first, 10);
    let b = parseInt(second, 10);
    const y = parseInt(third, 10);

    if (a > 12 && b <= 12) {
      // a is day, b is month
    } else if (b > 12 && a <= 12) {
      [a, b] = [b, a];
    }

    const date = new Date(y, b - 1, a);
    if (date.getMonth() === b - 1 && date.getDate() === a) return date;
  }

  const isoRe = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/;
  const isoMatch = isoRe.exec(str);
  if (isoMatch) {
    const yearStr = isoMatch[1];
    const monthStr = isoMatch[2];
    const dayStr = isoMatch[3];
    if (!yearStr || !monthStr || !dayStr) return null;
    const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));
    if (!isNaN(date.getTime())) return date;
  }

  return null;
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

  for (const row of rawRows) {
    const clientName = row.clientName.trim();
    const mobileNumber = row.mobileNumber ? row.mobileNumber.trim() : null;
    const policyTypeName = row.policyTypeName.trim();
    const vehicleNumber = row.vehicleNumber ? row.vehicleNumber.trim() : null;
    const policyNumber = row.policyNumber ? row.policyNumber.trim() : null;
    const premiumPrice = row.premiumPrice;
    const referenceNote = row.referenceNote ? row.referenceNote.trim() : null;
    const rawEndDateStr = String(row.endDate).trim();

    const rowErrors: string[] = [];

    // Syntactic Validation
    if (!clientName) {
      rowErrors.push('CLIENT NAME is required');
    } else {
      const nameRegex = /^[a-zA-Z\s.'-]+$/;
      if (!nameRegex.test(clientName)) {
        const invalidChars = Array.from(new Set(clientName.match(/[^a-zA-Z\s.'-]/g) || []));
        const charList = invalidChars.map((c) => `"${c}"`).join(', ');
        rowErrors.push(
          `CLIENT NAME "${clientName}" contains invalid characters: ${charList}. (Only letters, spaces, dots, hyphens, and apostrophes are allowed)`,
        );
      }
    }

    let normalisedMobile: string | null = null;
    if (!mobileNumber) {
      rowErrors.push('MOBILE NUMBER is required');
    } else {
      const cleaned = normaliseMobile(mobileNumber);
      if (!cleaned || !/^\+91[6-9]\d{9}$/.test(cleaned)) {
        rowErrors.push(
          `MOBILE NUMBER "${mobileNumber}" is invalid. Expected a 10-digit Indian mobile number (optionally with +91 prefix) starting with 6-9`,
        );
      } else {
        normalisedMobile = cleaned;
      }
    }

    if (!policyTypeName) {
      rowErrors.push('POLICY TYPE is required');
    }

    if (vehicleNumber) {
      const upperVehicle = vehicleNumber.toUpperCase();
      if (!VALIDATION.VEHICLE_NUMBER.test(upperVehicle)) {
        rowErrors.push(
          `VEHICLE NUMBER "${vehicleNumber}" is invalid. Expected format like MH12AB1234 (2 letters state code, 1-2 digits RTO code, 1-2 letters series, and 1-4 digits unique code)`,
        );
      }
    }

    if (policyNumber) {
      const policyNoRegex = /^[a-zA-Z0-9/-]+$/;
      if (!policyNoRegex.test(policyNumber)) {
        const invalidChars = Array.from(new Set(policyNumber.match(/[^a-zA-Z0-9/-]/g) || []));
        const charList = invalidChars.map((c) => `"${c}"`).join(', ');
        rowErrors.push(
          `POLICY NUMBER "${policyNumber}" contains invalid characters: ${charList}. (Only letters, numbers, hyphens, and slashes are allowed)`,
        );
      }
    }

    const parsedEndDate = parseDateValue(row.endDate);
    if (!parsedEndDate) {
      rowErrors.push(`END DATE "${rawEndDateStr}" is not a valid date. Use DD/MM/YYYY format`);
    }

    const formattedEndDate = parsedEndDate
      ? `${String(parsedEndDate.getDate()).padStart(2, '0')}/${String(
          parsedEndDate.getMonth() + 1,
        ).padStart(2, '0')}/${String(parsedEndDate.getFullYear())}`
      : rawEndDateStr;

    if (premiumPrice !== null && (isNaN(premiumPrice) || premiumPrice < 0)) {
      rowErrors.push(
        `PREMIUM PRICE "${String(row.premiumPrice)}" is invalid. Expected a positive number`,
      );
    }

    // Sheet-level duplicate policy numbers
    if (policyNumber && !rowErrors.length) {
      const upperPolicyNumber = policyNumber.toUpperCase();
      if (seenPolicyNumbersInSheet.has(upperPolicyNumber)) {
        rowErrors.push('Policy number is duplicated within the uploaded file');
      } else {
        seenPolicyNumbersInSheet.add(upperPolicyNumber);
      }
    }

    if (rowErrors.length > 0) {
      failedCount++;
      rowStatuses.push({
        rowNumber: row.rowNumber,
        clientName,
        mobileNumber,
        associate: row.associate,
        policyTypeName,
        vehicleNumber,
        policyNumber,
        endDate: formattedEndDate,
        premiumPrice,
        referenceNote,
        status: 'FAILED',
        reason: rowErrors.join('; '),
      });
      continue;
    }

    // Business Constraints Validation and Processing (Transactional)
    try {
      const mobile = normalisedMobile;
      const endDate = parsedEndDate;

      if (!mobile) {
        throw new Error('MOBILE NUMBER is required');
      }
      if (!endDate) {
        throw new Error('END DATE is required');
      }

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
        if (!currentPolicyTypeId) {
          throw new Error('POLICY TYPE ID is missing');
        }

        // 2. Client matching or creation
        let clientId: string;
        let rowCreatedClient = false;
        let rowMatchedClient = false;

        const existingClient = await tx.client.findFirst({
          where: { agentId, mobileNumber: mobile },
          select: { id: true, insuredName: true },
        });

        if (existingClient) {
          if (existingClient.insuredName.toLowerCase().trim() !== clientName.toLowerCase()) {
            throw new Error('Mobile number already belongs to another client');
          }
          clientId = existingClient.id;
          rowMatchedClient = true;
        } else {
          const newClient = await tx.client.create({
            data: {
              insuredName: clientName,
              mobileNumber: mobile,
              agentId,
            },
            select: { id: true },
          });
          clientId = newClient.id;
          rowCreatedClient = true;
        }

        // 3. Policy unique constraint check
        if (policyNumber) {
          const existingPolicy = await tx.policy.findFirst({
            where: { agentId, policyNumber },
            select: { id: true },
          });
          if (existingPolicy) {
            throw new Error('Policy Number already exists');
          }
        } else {
          // 4. Duplicate policy check (idempotency) when policyNumber is not present
          const existingPolicy = await tx.policy.findFirst({
            where: {
              agentId,
              clientId,
              policyTypeId: currentPolicyTypeId,
              endDate,
              premiumPrice,
            },
            select: { id: true },
          });

          if (existingPolicy) {
            return {
              isDuplicate: true,
              rowCreatedClient,
              rowMatchedClient,
              rowCreatedPolicyType,
            };
          }
        }

        // 5. Create policy
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
            renewalStatus: 'PENDING',
            insuredPersonName: row.associate || null,
          },
          select: { id: true },
        });

        // 6. Create status history
        await tx.policyStatusHistory.create({
          data: {
            policyId: policy.id,
            previousStatus: null,
            newStatus: 'PENDING',
            changedById: agentId,
          },
        });

        return {
          isDuplicate: false,
          rowCreatedClient,
          rowMatchedClient,
          rowCreatedPolicyType,
        };
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
          associate: row.associate,
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
          associate: row.associate,
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
        associate: row.associate,
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
