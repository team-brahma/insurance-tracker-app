import type { FastifyRequest, FastifyReply } from 'fastify';
import { assertAuthenticated } from '@middlewares/Auth.js';
import { generateTemplate, generateReportExcel } from '../excel/template.js';
import { parseExcel, processBulkImport, previewBulkImport } from '../excel/importService.js';
import { getDb } from '@database/index.js';
import { ValidationError } from '@errors/AppError.js';
import { HTTP_STATUS } from '@repo/constants';

export const bulkImportController = {
  async downloadTemplate(_request: FastifyRequest, reply: FastifyReply) {
    const buffer = generateTemplate();
    return reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename="import-template.xlsx"')
      .send(buffer);
  },

  async uploadAndImport(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);

    const file = await request.file();
    if (!file) {
      throw new ValidationError('No file uploaded');
    }

    if (!file.filename.endsWith('.xlsx') && !file.filename.endsWith('.xls')) {
      throw new ValidationError('File must be an .xlsx or .xls file');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);

    if (buffer.length === 0) {
      throw new ValidationError('Uploaded file is empty');
    }

    const db = getDb();

    const rows = parseExcel(buffer);
    if (rows.length === 0) {
      throw new ValidationError('No data rows found in the uploaded file');
    }

    const result = await processBulkImport(agentId, rows, db);

    return reply.code(HTTP_STATUS.OK).send({
      success: true,
      data: result,
    });
  },

  async previewImport(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);

    const file = await request.file();
    if (!file) throw new ValidationError('No file uploaded');

    if (!file.filename.endsWith('.xlsx') && !file.filename.endsWith('.xls')) {
      throw new ValidationError('File must be an .xlsx or .xls file');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);

    if (buffer.length === 0) throw new ValidationError('Uploaded file is empty');

    const db = getDb();
    const rows = parseExcel(buffer);
    if (rows.length === 0) throw new ValidationError('No data rows found in the uploaded file');

    const result = await previewBulkImport(agentId, rows, db);

    return reply.code(HTTP_STATUS.OK).send({
      success: true,
      data: result,
    });
  },

  async exportReport(request: FastifyRequest, reply: FastifyReply) {
    assertAuthenticated(request);
    const { rowStatuses } = request.body as {
      rowStatuses: Parameters<typeof generateReportExcel>[0];
    };
    const buffer = generateReportExcel(rowStatuses);
    return reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename="import-report.xlsx"')
      .send(buffer);
  },
};
