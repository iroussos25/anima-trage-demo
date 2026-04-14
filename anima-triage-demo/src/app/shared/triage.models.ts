// Shared types — single source of truth for Angular app and Lambda functions.
// FHIR R4 aligned. Mirrors lambda/shared/types.ts — keep in sync.

export type OnsetPeriod = 'today' | '1-3-days' | '4-7-days' | '1-plus-weeks';

export type CaseStatus = 'new' | 'in-progress' | 'resolved';

export interface TriageFormData {
  patientInitials: string;
  chiefComplaint: string;
  onset: OnsetPeriod;
  severity: number;
  allergies?: string;
}

export interface FhirCoding {
  system: string;
  code: string;
  display: string;
}

export interface FhirCodeableConcept {
  coding: FhirCoding[];
  text: string;
}

export interface FhirObservationComponent {
  code: FhirCodeableConcept;
  valueInteger?: number;
  valueString?: string;
}

export interface FhirObservation {
  resourceType: 'Observation';
  id: string;
  status: 'preliminary' | 'final' | 'amended';
  category: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: { display: string };
  effectiveDateTime: string;
  component: FhirObservationComponent[];
}

export interface FhirBundle {
  resourceType: 'Bundle';
  type: 'collection';
  timestamp: string;
  entry: Array<{ resource: FhirObservation }>;
}

export interface TriageRecord {
  caseId: string;
  submittedAt: string;
  status: CaseStatus;
  patientInitials: string;
  chiefComplaint: string;
  onset: OnsetPeriod;
  severity: number;
  allergies?: string;
  fhirBundle: FhirBundle;
}

export interface FetchTriageResponse {
  items: TriageRecord[];
}

export interface SubmitTriageResponse {
  caseId: string;
  message: string;
}

export interface UpdateStatusResponse {
  caseId: string;
  status: CaseStatus;
}

export const ONSET_LABELS: Record<OnsetPeriod, string> = {
  'today': 'Today',
  '1-3-days': '1–3 days ago',
  '4-7-days': '4–7 days ago',
  '1-plus-weeks': '1+ weeks ago',
};

export const STATUS_LABELS: Record<CaseStatus, string> = {
  'new': 'New',
  'in-progress': 'In Progress',
  'resolved': 'Resolved',
};
