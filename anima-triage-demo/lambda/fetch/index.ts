import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { TriageRecord, FetchTriageResponse } from '../shared/types';

const client = new DynamoDBClient({});
const TABLE_NAME = process.env['TABLE_NAME'] ?? 'triage-submissions';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env['ALLOWED_ORIGIN'] ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  try {
    const result = await client.send(
      new ScanCommand({ TableName: TABLE_NAME })
    );

    const items: TriageRecord[] = (result.Items ?? []).map(
      (item) => unmarshall(item) as TriageRecord
    );

    // Sort by severity descending (most urgent first), then by submittedAt descending
    items.sort((a, b) => {
      if (b.severity !== a.severity) return b.severity - a.severity;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

    const response: FetchTriageResponse = { items };

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error('DynamoDB Scan failed:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Failed to fetch triage submissions' }),
    };
  }
};
