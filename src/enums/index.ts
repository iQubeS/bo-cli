// Lead enum values
export const LeadStatus = [
  'Pending',
  'Active',
  'Won',
  'Lost',
  'On hold',
  'Abandoned',
] as const;

export const LeadLcmStatus = [
  'Registered',
  'Assigned',
  'Evaluation',
  'Appointment scheduled',
  'Proposal sent',
  'Negotiating proposal',
] as const;

export const LeadProbability = [
  '0 %',
  '10 %',
  '40 %',
  '60 %',
  '65%',
  '80%',
  '90%',
  '100 %',
] as const;

// Project enum values
export const ProjectActivity = [
  'Not started',
  'Started',
  'Pending',
  'Continuous',
  'Completed',
  'Archived',
] as const;

// NCR enum values
export const NcrType = [
  'Customer Feedback',
  'Non-Conformance',
  'Observation',
  'Improvements',
  'Supplier Deviation',
] as const;

export const NcrDirectCause = [
  'Equipment',
  'Enviorment',
  'Process',
  'Staff',
] as const;

export const NcrCategory = ['HSE', 'Quality'] as const;

export const NcrFeedbackType = ['Positive', 'Neutral', 'Negative'] as const;

export const NcrLocation = [
  'Stavanger Office',
  'India Office',
  'Customer Site',
] as const;

export const NcrRootCause = [
  'Design Error',
  'Lack of experience',
  'Lack of communication',
  'Management of change, not implemented / communicated',
  'Missing dimension/information on drawing',
  'Procedure, incorrect / unclear or missing',
  'Procedure, not followed',
  'Risk not evaluated',
  'Technical failure',
  'Other',
  'HR - Lack of competence',
  'HR - Lack of resources',
  'HR - Lack of training',
  'Human error',
  'Incorrect use of tools',
  'Inspection, poor or not performed',
  'Lack of experience transfer',
  'Management Decision',
  'Time pressure',
  'Use of equipment / tools',
  'Order / contract',
  'Handling of chemicals',
  'Environment and Chemicals',
  'N/A (Concession & Observation card)',
] as const;

// Contact enum values
export const ContactStatus = ['Active', 'Retired'] as const;

export const ContactLegalBasis = [
  'Legitimate interest - for doing business',
  'Freely given consent from contact',
  'Not applicable',
] as const;

// Company enum values
export const SupplierCategory = [
  'A - Critical Supplier',
  'B - Key suppliers',
  'C - Other',
] as const;

// Timeline enum values
export const LogType = [
  'Relations',
  'Email',
  'General',
  'Meeting',
  'Phone Call',
  'Task',
] as const;

// Validation utility
export function validateEnum(
  value: string | undefined,
  validValues: readonly string[],
  fieldName: string
): void {
  if (value !== undefined && !validValues.includes(value)) {
    throw new Error(
      `Invalid ${fieldName}: "${value}". Valid values: ${validValues.join(', ')}`
    );
  }
}
