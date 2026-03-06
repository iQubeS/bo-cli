import type { McpClient } from '../mcp/client.js';
import * as staticEnums from './index.js';

interface EnumData {
  Company?: {
    companyActive?: string[];
    companySupplierCategory?: string[];
    companyApprovedSupplier?: string[];
  };
  Leads?: {
    leadsStatus?: string[];
    leadsLcmStatus?: string[];
    leadsProbabilityForSale?: string[];
  };
  Project?: {
    projectActivity?: string[];
  };
  Contact?: {
    contactLegalBasis?: string[];
    contactStatus?: string[];
    contactMarketingConsent?: string[];
  };
  NCR?: {
    ncrTypeRegistration?: string[];
    ncrDirectCause?: string[];
    ncrLocation?: string[];
    ncrFeedbackType?: string[];
    ncrCategory?: string[];
    ncrRootCause?: string[];
  };
}

let cached: EnumData | null = null;

export async function loadEnums(client: McpClient): Promise<void> {
  if (cached) return;
  try {
    const response = await client.readResource('business-online://enums') as {
      contents?: { text?: string }[];
    };
    const text = response?.contents?.[0]?.text;
    if (text) {
      cached = JSON.parse(text) as EnumData;
    }
  } catch {
    // Fall back to static enums silently
  }
}

// Getters — return server values if available, else static fallback
export function leadsStatus(): readonly string[] {
  return cached?.Leads?.leadsStatus ?? staticEnums.LeadStatus;
}

export function leadsLcmStatus(): readonly string[] {
  return cached?.Leads?.leadsLcmStatus ?? staticEnums.LeadLcmStatus;
}

export function leadsProbability(): readonly string[] {
  return cached?.Leads?.leadsProbabilityForSale ?? staticEnums.LeadProbability;
}

export function projectActivity(): readonly string[] {
  return cached?.Project?.projectActivity ?? staticEnums.ProjectActivity;
}

export function contactStatus(): readonly string[] {
  return cached?.Contact?.contactStatus ?? staticEnums.ContactStatus;
}

export function contactLegalBasis(): readonly string[] {
  return cached?.Contact?.contactLegalBasis ?? staticEnums.ContactLegalBasis;
}

export function supplierCategory(): readonly string[] {
  return cached?.Company?.companySupplierCategory ?? staticEnums.SupplierCategory;
}

export function ncrType(): readonly string[] {
  return cached?.NCR?.ncrTypeRegistration ?? staticEnums.NcrType;
}

export function ncrDirectCause(): readonly string[] {
  return cached?.NCR?.ncrDirectCause ?? staticEnums.NcrDirectCause;
}

export function ncrCategory(): readonly string[] {
  return cached?.NCR?.ncrCategory ?? staticEnums.NcrCategory;
}

export function ncrFeedbackType(): readonly string[] {
  return cached?.NCR?.ncrFeedbackType ?? staticEnums.NcrFeedbackType;
}

export function ncrLocation(): readonly string[] {
  return cached?.NCR?.ncrLocation ?? staticEnums.NcrLocation;
}

export function ncrRootCause(): readonly string[] {
  return cached?.NCR?.ncrRootCause ?? staticEnums.NcrRootCause;
}

export function logType(): readonly string[] {
  return staticEnums.LogType;
}
