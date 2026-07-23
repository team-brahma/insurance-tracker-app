export function sanitizePolicy<T extends Record<string, unknown>>(obj: T): T {
  delete obj.createdAt;
  delete obj.updatedAt;
  const client = obj.client as Record<string, unknown> | undefined;
  if (client) {
    delete client.updatedAt;
  }
  const policyType = obj.policyType as Record<string, unknown> | undefined;
  if (policyType) {
    delete policyType.createdAt;
    delete policyType.updatedAt;
  }
  const insuranceProvider = obj.insuranceProvider as Record<string, unknown> | undefined;
  if (insuranceProvider) {
    delete insuranceProvider.createdAt;
    delete insuranceProvider.updatedAt;
  }
  return obj;
}

export function sanitizeClient<T extends Record<string, unknown>>(obj: T): T {
  delete obj.updatedAt;
  const policies = obj.policies as Record<string, unknown>[] | undefined;
  if (policies) {
    for (const p of policies) {
      delete p.createdAt;
      delete p.updatedAt;
      const pt = p.policyType as Record<string, unknown> | undefined;
      if (pt) {
        delete pt.createdAt;
        delete pt.updatedAt;
      }
      const ip = p.insuranceProvider as Record<string, unknown> | undefined;
      if (ip) {
        delete ip.createdAt;
        delete ip.updatedAt;
      }
    }
  }
  return obj;
}

export function sanitizeEnquiry<T extends Record<string, unknown>>(obj: T): T {
  delete obj.updatedAt;
  const policyType = obj.policyType as Record<string, unknown> | undefined;
  if (policyType) {
    delete policyType.createdAt;
    delete policyType.updatedAt;
  }
  return obj;
}

export function sanitizeSettings<T extends Record<string, unknown>>(obj: T): T {
  delete obj.createdAt;
  delete obj.updatedAt;
  return obj;
}

export function sanitizePolicyType<T extends Record<string, unknown>>(obj: T): T {
  delete obj.createdAt;
  delete obj.updatedAt;
  return obj;
}

export function sanitizeInsuranceProvider<T extends Record<string, unknown>>(obj: T): T {
  delete obj.createdAt;
  delete obj.updatedAt;
  return obj;
}

export function sanitizeUser<T extends Record<string, unknown>>(obj: T): T {
  delete obj.updatedAt;
  return obj;
}
