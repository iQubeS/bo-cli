import { describe, it, expect } from 'vitest';
import {
  validateEnum,
  LeadStatus,
  LeadLcmStatus,
  LeadProbability,
  ProjectActivity,
  NcrType,
  NcrDirectCause,
  NcrCategory,
  NcrFeedbackType,
  NcrLocation,
  NcrRootCause,
  ContactStatus,
  ContactLegalBasis,
  SupplierCategory,
  LogType,
} from '../src/enums/index.js';

describe('validateEnum', () => {
  const validValues = ['Active', 'Pending', 'Closed'] as const;

  it('passes for a valid value', () => {
    expect(() => validateEnum('Active', validValues, 'status')).not.toThrow();
  });

  it('passes for undefined (optional fields)', () => {
    expect(() => validateEnum(undefined, validValues, 'status')).not.toThrow();
  });

  it('throws for an invalid value', () => {
    expect(() => validateEnum('Invalid', validValues, 'status')).toThrow(
      'Invalid status: "Invalid"'
    );
  });

  it('includes valid values in error message', () => {
    expect(() => validateEnum('Bad', validValues, 'status')).toThrow(
      'Active, Pending, Closed'
    );
  });
});

describe('static enum arrays', () => {
  const enums: Record<string, readonly string[]> = {
    LeadStatus,
    LeadLcmStatus,
    LeadProbability,
    ProjectActivity,
    NcrType,
    NcrDirectCause,
    NcrCategory,
    NcrFeedbackType,
    NcrLocation,
    NcrRootCause,
    ContactStatus,
    ContactLegalBasis,
    SupplierCategory,
    LogType,
  };

  for (const [name, values] of Object.entries(enums)) {
    it(`${name} is non-empty`, () => {
      expect(values.length).toBeGreaterThan(0);
    });

    it(`${name} has no duplicate values`, () => {
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });
  }
});
