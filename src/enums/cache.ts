import type { McpClient } from '../mcp/client.js';
import type { EnumCategoryConfig } from '../config/index.js';
import * as staticEnums from './index.js';

let cached: EnumCategoryConfig | null = null;

/**
 * Load enums from an MCP client (server resource) or directly from a config data object.
 *
 * - MCP mode: pass an McpClient — reads from `business-online://enums` resource
 * - REST mode: pass an EnumCategoryConfig object — loaded from config.enums[tenantName]
 */
export async function loadEnums(source: McpClient | EnumCategoryConfig): Promise<void> {
  if (cached) return;

  // Check if source is an McpClient by looking for the readResource method
  if ('readResource' in source && typeof (source as McpClient).readResource === 'function') {
    // MCP path — read from server resource
    try {
      const client = source as McpClient;
      const response = await client.readResource('business-online://enums') as {
        contents?: { text?: string }[];
      };
      const text = response?.contents?.[0]?.text;
      if (text) {
        cached = JSON.parse(text) as EnumCategoryConfig;
      }
    } catch {
      // Fall back to static enums silently
    }
    return;
  }

  // Direct enum data (from config, used in REST mode)
  cached = source as EnumCategoryConfig;
}

/** Reset cached enums (useful for testing or when switching environments). */
export function resetEnumCache(): void {
  cached = null;
}

// Getters — return server/config values if available, else static fallback
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
