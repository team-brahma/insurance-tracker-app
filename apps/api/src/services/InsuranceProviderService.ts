import { insuranceProviderRepository } from '@repositories/InsuranceProviderRepository.js';
import { NotFoundError, ConflictError, ValidationError } from '@errors/AppError.js';
import { getDb } from '@database/index.js';

export const insuranceProviderService = {
  async list(search?: string, page?: number, limit?: number) {
    return insuranceProviderRepository.findAll(search, page, limit);
  },

  async getById(id: string) {
    const provider = await insuranceProviderRepository.findById(id);
    if (!provider) throw new NotFoundError('InsuranceProvider', id);
    return provider;
  },

  async create(data: { name: string }) {
    const existing = await insuranceProviderRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError(`Insurance provider "${data.name}" already exists`);
    }
    return insuranceProviderRepository.create(data);
  },

  async update(id: string, data: Partial<{ name: string | undefined }>) {
    await this.getById(id);

    if (data.name) {
      const existing = await insuranceProviderRepository.findByName(data.name);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Insurance provider "${data.name}" already exists`);
      }
    }

    return insuranceProviderRepository.update(id, data);
  },

  async delete(id: string) {
    await this.getById(id);

    const db = getDb();
    const policiesCount = await db.policy.count({ where: { insuranceProviderId: id } });

    if (policiesCount > 0) {
      throw new ValidationError(
        'Cannot delete insurance provider because it is in use by policies',
      );
    }

    return insuranceProviderRepository.delete(id);
  },
};
