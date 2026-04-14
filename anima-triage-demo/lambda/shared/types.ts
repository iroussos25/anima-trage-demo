// Shared types used by both Lambda functions and Angular frontend
// FHIR R4 shaped — mirrors the Observation resource for symptom data

export type OnsetPeriod = 'today' | '1-3-days' | '4-7-days' | '1-plus-weeks';

export type CaseStatus = 'new' | 'in-progress' | 'resolved';

export interface TriageFormData {
  patientInitials: string;
  chiefComplaint: string;
  onset: OnsetPeriod;
  severity: number; // 1–10
  allergies?: string;
}

// FHIR R4 Coding — standard clinical terminology reference
export interface FhirCoding {
  system: string;
  code: string;
  display: string;
}

// FHIR R4 CodeableConcept
export interface FhirCodeableConcept {
  coding: FhirCoding[];
  text: string;
}

// FHIR R4 Observation component (used for severity)
export interface FhirObservationComponent {
  code: FhirCodeableConcept;
  valueInteger?: number;
  valueString?: string;
}

// FHIR R4 Observation resource — represents a clinical observation/symptom report
export interface FhirObservation {
  resourceType: 'Observation';
  id: string; // caseId
  status: 'preliminary' | 'final' | 'amended';
  category: FhirCodeableConcept[];
  code: FhirCodeableConcept; // Chief complaint coded via SNOMED CT
  subject: {
    display: string; // Patient initials (de-identified)
  };
  effectiveDateTime: string; // ISO 8601
  component: FhirObservationComponent[];
}

// FHIR R4 Bundle — wraps the Observation for transport
export interface FhirBundle {
  resourceType: 'Bundle';
  type: 'collection';
  timestamp: string;
  entry: Array<{
    resource: FhirObservation;
  }>;
}

// Full record as stored in DynamoDB
export interface TriageRecord {
  caseId: string;
  submittedAt: string; // ISO 8601
  status: CaseStatus;
  patientInitials: string;
  chiefComplaint: string;
  onset: OnsetPeriod;
  severity: number;
  allergies?: string;
  fhirBundle: FhirBundle; // Full FHIR R4 representation
}

// Response shape from GET /triage
export interface FetchTriageResponse {
  items: TriageRecord[];
}

// Response shape from POST /triage
export interface SubmitTriageResponse {
  caseId: string;
  message: string;
}

// Response shape from PATCH /triage/{caseId}/status
export interface UpdateStatusResponse {
  caseId: string;
  status: CaseStatus;
}
