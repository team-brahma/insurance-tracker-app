import { policyTypeRepository } from '@repositories/PolicyTypeRepository.js';
import { NotFoundError, ConflictError, ValidationError } from '@errors/AppError.js';
import { getDb } from '@database/index.js';
import { formatSmartPolicyTypeName } from '@repo/utils';

export const policyTypeService = {
  async list(search?: string, page?: number, limit?: number) {
    return policyTypeRepository.findAll(search, page, limit);
  },

  async getById(id: string) {
    const policyType = await policyTypeRepository.findById(id);
    if (!policyType) throw new NotFoundError('PolicyType', id);
    return policyType;
  },

  async create(data: { name: string }) {
    const formattedName = formatSmartPolicyTypeName(data.name);
    const existing = await policyTypeRepository.findByName(formattedName);
    if (existing) {
      throw new ConflictError(`Policy type "${formattedName}" already exists`);
    }
    return policyTypeRepository.create({ name: formattedName });
  },

  async update(id: string, data: Partial<{ name: string | undefined }>) {
    await this.getById(id);

    const updateData: { name?: string } = {};
    if (data.name) {
      const formattedName = formatSmartPolicyTypeName(data.name);
      const existing = await policyTypeRepository.findByName(formattedName);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Policy type "${formattedName}" already exists`);
      }
      updateData.name = formattedName;
    }

    return policyTypeRepository.update(id, updateData);
  },

  async delete(id: string) {
    await this.getById(id);

    const db = getDb();
    const policiesCount = await db.policy.count({ where: { policyTypeId: id } });
    const enquiriesCount = await db.enquiry.count({ where: { policyTypeId: id } });

    if (policiesCount > 0 || enquiriesCount > 0) {
      throw new ValidationError(
        'Cannot delete policy type because it is in use by policies or enquiries',
      );
    }

    return policyTypeRepository.delete(id);
  },
};
