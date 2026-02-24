import {
  APIGatewayClient,
  CreateAuthorizerCommand,
  GetAuthorizersCommand,
} from '@aws-sdk/client-api-gateway';

const REGION = process.env['AWS_REGION'] || 'eu-west-1';
const AUTHORIZER_NAME = process.env['API_GATEWAY_TOKEN_AUTHORIZER_NAME'] || 'shipwrecker-token-authorizer';
const EXISTING_AUTHORIZER_ID = process.env['API_GATEWAY_TOKEN_AUTHORIZER_ID'];
const AUTHORIZER_LAMBDA_ARN = process.env['API_GATEWAY_AUTHORIZER_LAMBDA_ARN'];
const EXPECTED_TOKEN_VALUE = process.env['AUTH_TOKEN_VALUE'] || 'headerValue1';

const apiGatewayClient = new APIGatewayClient({ region: REGION });

type AuthorizerEvent = {
  methodArn: string;
  authorizationToken?: string;
};

type AuthorizerResponse = {
  principalId: string;
  policyDocument?: {
    Version: string;
    Statement: Array<{
      Action: string;
      Effect: 'Allow' | 'Deny';
      Resource: string;
    }>;
  };
  context?: {
    stringKey: string;
    numberKey: number;
    booleanKey: boolean;
  };
};

function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string
): AuthorizerResponse {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context: {
      stringKey: 'stringval',
      numberKey: 123,
      booleanKey: true,
    },
  };
}

function generateAllow(principalId: string, resource: string): AuthorizerResponse {
  return generatePolicy(principalId, 'Allow', resource);
}

function generateDeny(principalId: string, resource: string): AuthorizerResponse {
  return generatePolicy(principalId, 'Deny', resource);
}

const handler = async (event: AuthorizerEvent): Promise<AuthorizerResponse> => {
  const tokenValue = event.authorizationToken;

  if (tokenValue === EXPECTED_TOKEN_VALUE) {
    return generateAllow('me', event.methodArn);
  }

  return generateDeny('me', event.methodArn);
};

async function ensureTokenAuthorizer(restApiId: string): Promise<string> {
  if (EXISTING_AUTHORIZER_ID) {
    return EXISTING_AUTHORIZER_ID;
  }

  if (!AUTHORIZER_LAMBDA_ARN) {
    throw new Error(
      'Missing API_GATEWAY_AUTHORIZER_LAMBDA_ARN environment variable required to create a TOKEN authorizer.'
    );
  }

  const existingAuthorizers = await apiGatewayClient.send(
    new GetAuthorizersCommand({ restApiId })
  );

  const existing = existingAuthorizers.items?.find(
    (authorizer) => authorizer.name === AUTHORIZER_NAME
  );

  if (existing?.id) {
    return existing.id;
  }

  const created = await apiGatewayClient.send(
    new CreateAuthorizerCommand({
      restApiId,
      name: AUTHORIZER_NAME,
      type: 'TOKEN',
      identitySource: 'method.request.header.Authorization',
      authorizerUri: `arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${AUTHORIZER_LAMBDA_ARN}/invocations`,
    })
  );

  if (!created.id) {
    throw new Error('Failed to create API Gateway TOKEN authorizer.');
  }

  return created.id;
}

export { ensureTokenAuthorizer, handler };
