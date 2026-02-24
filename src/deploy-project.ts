import {
  APIGatewayClient,
  CreateDeploymentCommand,
  CreateResourceCommand,
  GetResourcesCommand,
  PutIntegrationCommand,
  PutMethodCommand,
  CreateRestApiCommand,
} from '@aws-sdk/client-api-gateway';
import { S3 } from './s3';
import { ApiGateway } from './apigateway';

const REGION = process.env['AWS_REGION'] || 'eu-west-1';
const API_NAME = 'shipwrecker-api';
const STAGE_NAME = 'dev';

const apiGatewayClient = new APIGatewayClient({ region: REGION });

async function getRootResourceId(restApiId: string): Promise<string> {
  const resources = await apiGatewayClient.send(
    new GetResourcesCommand({ restApiId })
  );

  const rootResource = resources.items?.find((resource) => resource.path === '/');
  if (!rootResource?.id) {
    throw new Error('Unable to find API Gateway root resource id.');
  }

  return rootResource.id;
}

async function createResource(
  restApiId: string,
  parentId: string,
  pathPart: string
): Promise<string> {
  const response = await apiGatewayClient.send(
    new CreateResourceCommand({
      restApiId,
      parentId,
      pathPart,
    })
  );

  if (!response.id) {
    throw new Error(`Failed to create resource: ${pathPart}`);
  }

  return response.id;
}

async function addGetMethodWithMockIntegration(
  restApiId: string,
  resourceId: string
): Promise<void> {
  await apiGatewayClient.send(
    new PutMethodCommand({
      restApiId,
      resourceId,
      httpMethod: 'GET',
      authorizationType: 'NONE',
    })
  );

  await apiGatewayClient.send(
    new PutIntegrationCommand({
      restApiId,
      resourceId,
      httpMethod: 'GET',
      type: 'MOCK',
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    })
  );
}

async function setupApiGateway(): Promise<{ restApiId: string; invokeUrl: string }> {
  const createApiResponse = await apiGatewayClient.send(
    new CreateRestApiCommand({
      name: API_NAME,
      description: 'Shipwrecker REST API',
      endpointConfiguration: {
        types: ['REGIONAL'],
      },
    })
  );

  if (!createApiResponse.id) {
    throw new Error('Failed to create API Gateway REST API.');
  }

  const restApiId = createApiResponse.id;
  const rootResourceId = await getRootResourceId(restApiId);

  const shipsResourceId = await createResource(restApiId, rootResourceId, 'ships');
  const photoResourceId = await createResource(restApiId, shipsResourceId, 'photo');
  const photoKeyResourceId = await createResource(restApiId, photoResourceId, '{key}');
  const profileResourceId = await createResource(restApiId, shipsResourceId, 'profile');
  const profileKeyResourceId = await createResource(
    restApiId,
    profileResourceId,
    '{key}'
  );

  await addGetMethodWithMockIntegration(restApiId, shipsResourceId);
  await addGetMethodWithMockIntegration(restApiId, photoKeyResourceId);
  await addGetMethodWithMockIntegration(restApiId, profileKeyResourceId);

  await apiGatewayClient.send(
    new CreateDeploymentCommand({
      restApiId,
      stageName: STAGE_NAME,
      description: 'Initial endpoint deployment',
    })
  );

  return {
    restApiId,
    invokeUrl: `https://${restApiId}.execute-api.${REGION}.amazonaws.com/${STAGE_NAME}`,
  };
}

async function deploy() {
  try {
    S3.test();
    ApiGateway.test();
    console.log('🚀 Starting Project Deployment...');
    console.log('🌐 Creating API Gateway and endpoints...');

    const apiGateway = await setupApiGateway();

    console.log('✅ API Gateway setup complete.');
    console.log(`📌 REST API ID: ${apiGateway.restApiId}`);
    console.log(`🔗 Invoke URL: ${apiGateway.invokeUrl}`);
    console.log('Project deployed...');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deploy();

export {};
