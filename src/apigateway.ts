import {
  APIGatewayClient,
  CreateDeploymentCommand,
  CreateResourceCommand,
  DeleteRestApiCommand,
  GetRestApisCommand,
  GetResourcesCommand,
  PutIntegrationCommand,
  PutMethodCommand,
  CreateRestApiCommand,
} from '@aws-sdk/client-api-gateway';
import { ensureTokenAuthorizer } from './authorizer';

const REGION = process.env['AWS_REGION'] || 'eu-west-1';
const API_NAME = 'shipwrecker-api';
const STAGE_NAME = 'dev';

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
    resourceId: string,
    authorizerId: string
  ): Promise<void> {
    await apiGatewayClient.send(
      new PutMethodCommand({
        restApiId,
        resourceId,
        httpMethod: 'GET',
        authorizationType: 'CUSTOM',
        authorizerId,
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

  static async setupApiGateway(): Promise<{ restApiId: string; invokeUrl: string }> {
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
  const tokenAuthorizerId = await ensureTokenAuthorizer(restApiId);
    const rootResourceId = await ApiGateway.getRootResourceId(restApiId);

    const shipsResourceId = await ApiGateway.createResource(restApiId, rootResourceId, 'ships');
    const photoResourceId = await ApiGateway.createResource(restApiId, shipsResourceId, 'photo');
    const photoKeyResourceId = await ApiGateway.createResource(restApiId, photoResourceId, '{key}');
    const profileResourceId = await ApiGateway.createResource(restApiId, shipsResourceId, 'profile');
    const profileKeyResourceId = await ApiGateway.createResource(restApiId, profileResourceId, '{key}');

    await ApiGateway.addGetMethodWithMockIntegration(restApiId, shipsResourceId, tokenAuthorizerId);
    await ApiGateway.addGetMethodWithMockIntegration(restApiId, photoKeyResourceId, tokenAuthorizerId);
    await ApiGateway.addGetMethodWithMockIntegration(restApiId, profileKeyResourceId, tokenAuthorizerId);

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