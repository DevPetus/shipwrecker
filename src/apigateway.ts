import {
  APIGatewayClient,
  CreateApiKeyCommand,
  CreateDeploymentCommand,
  CreateResourceCommand,
  DeleteRestApiCommand,
  GetRestApisCommand,
  GetResourcesCommand,
  PutIntegrationResponseCommand,
  PutIntegrationCommand,
  PutMethodResponseCommand,
  PutMethodCommand,
  CreateRestApiCommand,
} from '@aws-sdk/client-api-gateway';

const REGION = process.env['AWS_REGION'] || 'eu-west-1';
const API_NAME = 'shipwrecker-api';
const STAGE_NAME = 'dev';
const API_KEY_NAME = process.env['API_GATEWAY_API_KEY_NAME'] || 'shipwrecker-api-key';

const apiGatewayClient = new APIGatewayClient({ region: REGION });

class ApiGateway {
  static async getRootResourceId(restApiId: string): Promise<string> {
    const resources = await apiGatewayClient.send(
      new GetResourcesCommand({ restApiId })
    );

    const rootResource = resources.items?.find((resource) => resource.path === '/');
    if (!rootResource?.id) {
      throw new Error('Unable to find API Gateway root resource id.');
    }

    return rootResource.id;
  }

  static async createResource(
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

  static async addGetMethodWithMockIntegration(
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

    await apiGatewayClient.send(
      new PutMethodResponseCommand({
        restApiId,
        resourceId,
        httpMethod: 'GET',
        statusCode: '200',
        responseModels: {
          'application/json': 'Empty',
        },
      })
    );
  }

  static async addCorsOptionsMethod(
    restApiId: string,
    resourceId: string
  ): Promise<void> {
    await apiGatewayClient.send(
      new PutMethodCommand({
        restApiId,
        resourceId,
        httpMethod: 'OPTIONS',
        authorizationType: 'NONE',
      })
    );

    await apiGatewayClient.send(
      new PutIntegrationCommand({
        restApiId,
        resourceId,
        httpMethod: 'OPTIONS',
        type: 'MOCK',
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      })
    );

    await apiGatewayClient.send(
      new PutMethodResponseCommand({
        restApiId,
        resourceId,
        httpMethod: 'OPTIONS',
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true,
          'method.response.header.Access-Control-Allow-Origin': true,
        },
        responseModels: {
          'application/json': 'Empty',
        },
      })
    );

    await apiGatewayClient.send(
      new PutIntegrationResponseCommand({
        restApiId,
        resourceId,
        httpMethod: 'OPTIONS',
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
          'method.response.header.Access-Control-Allow-Methods': "'GET,OPTIONS'",
          'method.response.header.Access-Control-Allow-Origin': "'*'",
        },
      })
    );
  }

  static async createApiToken(): Promise<string> {
    const response = await apiGatewayClient.send(
      new CreateApiKeyCommand({
        name: API_KEY_NAME,
        enabled: true,
        generateDistinctId: true,
      })
    );

    if (!response.value) {
      throw new Error('Failed to create API token (API Key).');
    }

    return response.value;
  }

  static async setupApiGateway(): Promise<{ restApiId: string; invokeUrl: string; apiToken: string }> {
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
    const rootResourceId = await ApiGateway.getRootResourceId(restApiId);

    const shipsResourceId = await ApiGateway.createResource(restApiId, rootResourceId, 'ships');
    const photoResourceId = await ApiGateway.createResource(restApiId, shipsResourceId, 'photo');
    const photoKeyResourceId = await ApiGateway.createResource(restApiId, photoResourceId, '{key}');
    const profileResourceId = await ApiGateway.createResource(restApiId, shipsResourceId, 'profile');
    const profileKeyResourceId = await ApiGateway.createResource(restApiId, profileResourceId, '{key}');

    await ApiGateway.addGetMethodWithMockIntegration(restApiId, shipsResourceId);
    await ApiGateway.addGetMethodWithMockIntegration(restApiId, photoKeyResourceId);
    await ApiGateway.addGetMethodWithMockIntegration(restApiId, profileKeyResourceId);

    await ApiGateway.addCorsOptionsMethod(restApiId, shipsResourceId);
    await ApiGateway.addCorsOptionsMethod(restApiId, photoKeyResourceId);
    await ApiGateway.addCorsOptionsMethod(restApiId, profileKeyResourceId);

    await apiGatewayClient.send(
      new CreateDeploymentCommand({
        restApiId,
        stageName: STAGE_NAME,
        description: 'Initial endpoint deployment',
      })
    );

    const apiToken = await ApiGateway.createApiToken();

    return {
      restApiId,
      invokeUrl: `https://${restApiId}.execute-api.${REGION}.amazonaws.com/${STAGE_NAME}`,
      apiToken,
    };
  }

  static async destroyApiGateway(): Promise<void> {
    const apis = await apiGatewayClient.send(
      new GetRestApisCommand({
        limit: 500,
      })
    );

    const matchingApis = apis.items?.filter((api) => api.name === API_NAME) || [];

    for (const api of matchingApis) {
      if (!api.id) {
        continue;
      }

      await apiGatewayClient.send(
        new DeleteRestApiCommand({
          restApiId: api.id,
        })
      );
    }
  }

}

export { ApiGateway };