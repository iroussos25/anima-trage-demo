import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { CaseStatus, UpdateStatusResponse } from '../shared/types';

const client = new DynamoDBClient({});
const TABLE_NAME = process.env['TABLE_NAME'] ?? 'triage-submissions';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env['ALLOWED_ORIGIN'] ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'PATCH,OPTIONS',
  'Content-Type': 'application/json',
};

const VALID_STATUSES: CaseStatus[] = ['new', 'in-progress', 'resolved'];

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const caseId = event.pathParameters?.['caseId'];
  if (!caseId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Missing caseId path parameter' }),
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Request body is required' }),
    };
  }

  let body: { status: CaseStatus };
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Invalid JSON body' }),
    };
  }

  if (!VALID_STATUSES.includes(body.status)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: `status must be one of: ${VALID_STATUSES.join(', ')}` }),
    };
  }

  try {
    await client.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({ caseId }),
        UpdateExpression: 'SET #s = :status',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: marshall({ ':status': body.status }),
        ConditionExpression: 'attribute_exists(caseId)',
      })
    );
  } catch (err: any) {
    if (err?.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Case not found' }),
      };
    }
    console.error('DynamoDB UpdateItem failed:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Failed to update case status' }),
    };
  }

  const response: UpdateStatusResponse = { caseId, status: body.status };
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(response),
  };
};
