import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { randomUUID } from 'crypto';
import {
  TriageFormData,
  TriageRecord,
  FhirBundle,
  FhirObservation,
  CaseStatus,
} from '../shared/types';

const client = new DynamoDBClient({});
const TABLE_NAME = process.env['TABLE_NAME'] ?? 'triage-submissions';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env['ALLOWED_ORIGIN'] ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
};

function buildFhirBundle(caseId: string, data: TriageFormData, timestamp: string): FhirBundle {
  const observation: FhirObservation = {
    resourceType: 'Observation',
    id: caseId,
    status: 'preliminary',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'survey',
            display: 'Survey',
          },
        ],
        text: 'Patient-reported triage survey',
      },
    ],
    code: {
      coding: [
        {
          // SNOMED CT: Finding reported by subject
          system: 'http://snomed.info/sct',
          code: '418799008',
          display: 'Finding reported by subject or history provider',
        },
      ],
      text: data.chiefComplaint,
    },
    subject: {
      display: data.patientInitials,
    },
    effectiveDateTime: timestamp,
    component: [
      {
        code: {
          coding: [
            {
              // LOINC: Pain severity - 0-10 verbal numeric rating
              system: 'http://loinc.org',
              code: '72514-3',
              display: 'Pain severity - 0-10 verbal numeric rating [Score]',
            },
          ],
          text: 'Severity score (1-10)',
        },
        valueInteger: data.severity,
      },
      {
        code: {
          coding: [
            {
              // SNOMED CT: Duration of symptoms
              system: 'http://snomed.info/sct',
              code: '57797005',
              display: 'Duration of symptoms',
            },
          ],
          text: 'Onset period',
        },
        valueString: data.onset,
      },
      ...(data.allergies
        ? [
            {
              code: {
                coding: [
                  {
                    // SNOMED CT: Allergy status
                    system: 'http://snomed.info/sct',
                    code: '373573001',
                    display: 'Clinical finding',
                  },
                ],
                text: 'Known allergies',
              },
              valueString: data.allergies,
            },
          ]
        : []),
    ],
  };

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp,
    entry: [{ resource: observation }],
  };
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Request body is required' }),
    };
  }

  let data: TriageFormData;
  try {
    data = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Invalid JSON body' }),
    };
  }

  // Validate required fields
  if (!data.patientInitials || !data.chiefComplaint || !data.onset || data.severity == null) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Missing required fields' }),
    };
  }

  if (data.severity < 1 || data.severity > 10) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Severity must be between 1 and 10' }),
    };
  }

  const caseId = randomUUID();
  const timestamp = new Date().toISOString();
  const status: CaseStatus = 'new';

  const record: TriageRecord = {
    caseId,
    submittedAt: timestamp,
    status,
    patientInitials: data.patientInitials,
    chiefComplaint: data.chiefComplaint,
    onset: data.onset,
    severity: data.severity,
    allergies: data.allergies,
    fhirBundle: buildFhirBundle(caseId, data, timestamp),
  };

  try {
    await client.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall(record, { removeUndefinedValues: true }),
      })
    );
  } catch (err) {
    console.error('DynamoDB PutItem failed:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Failed to save triage submission' }),
    };
  }

  return {
    statusCode: 201,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      caseId,
      message: 'Your case has been received.',
    }),
  };
};
