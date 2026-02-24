import {
  AttachRolePolicyCommand,
  CreateRoleCommand,
  GetRoleCommand,
  IAMClient,
} from '@aws-sdk/client-iam';

const REGION = process.env['AWS_REGION'] || 'eu-west-1';

const APIGATEWAY_SERVICE_PRINCIPAL = 'apigateway.amazonaws.com';
const DYNAMODB_ROLE_NAME = 'APIGatewayDynamoDBServiceRole';
const S3_ROLE_NAME = 'APIGatewayS3ServiceRole';
const DYNAMODB_ACCESS_POLICY_ARN = 'arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess';
const S3_READ_POLICY_ARN = 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess';

const iamClient = new IAMClient({ region: REGION });

function isNoSuchEntity(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as { name?: string; Code?: string; Error?: { Code?: string } };
  const code = err.name || err.Code || err.Error?.Code;
  return code === 'NoSuchEntity' || code === 'NoSuchEntityException';
}

function isAccessDenied(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as { name?: string; Code?: string; Error?: { Code?: string } };
  const code = err.name || err.Code || err.Error?.Code;
  return code === 'AccessDenied' || code === 'AccessDeniedException';
}

async function getRoleArn(roleName: string): Promise<string> {
  const role = await iamClient.send(
    new GetRoleCommand({
      RoleName: roleName,
    })
  );

  if (!role.Role?.Arn) {
    throw new Error(`Role ${roleName} found but ARN is missing.`);
  }

  return role.Role.Arn;
}

async function ensureRole(roleName: string, policyArn: string): Promise<string> {
  try {
    return await getRoleArn(roleName);
  } catch (error) {
    if (!isNoSuchEntity(error)) {
      throw error;
    }
  }

  const assumeRolePolicyDocument = JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Service: APIGATEWAY_SERVICE_PRINCIPAL,
        },
        Action: 'sts:AssumeRole',
      },
    ],
  });

  try {
    await iamClient.send(
      new CreateRoleCommand({
        RoleName: roleName,
        AssumeRolePolicyDocument: assumeRolePolicyDocument,
        Description: `Execution role for API Gateway integration: ${roleName}`,
      })
    );

    await iamClient.send(
      new AttachRolePolicyCommand({
        RoleName: roleName,
        PolicyArn: policyArn,
      })
    );

    return await getRoleArn(roleName);
  } catch (error) {
    if (isAccessDenied(error)) {
      try {
        return await getRoleArn(roleName);
      } catch {
        throw new Error(
          `Insufficient IAM permissions to create ${roleName}. ` +
            `Provide an existing role with this exact name, or use env override APIGATEWAY_${roleName.includes('S3') ? 'S3' : 'DYNAMODB'}_ROLE_ARN.`
        );
      }
    }

    throw error;
  }
}

async function ensureApiGatewayExecutionRoles(): Promise<{
  s3RoleArn: string;
  dynamoRoleArn: string;
}> {
  const envS3RoleArn = process.env['APIGATEWAY_S3_ROLE_ARN'];
  const envDynamoRoleArn = process.env['APIGATEWAY_DYNAMODB_ROLE_ARN'];

  if (envS3RoleArn && envDynamoRoleArn) {
    return {
      s3RoleArn: envS3RoleArn,
      dynamoRoleArn: envDynamoRoleArn,
    };
  }

  const [dynamoRoleArn, s3RoleArn] = await Promise.all([
    ensureRole(DYNAMODB_ROLE_NAME, DYNAMODB_ACCESS_POLICY_ARN),
    ensureRole(S3_ROLE_NAME, S3_READ_POLICY_ARN),
  ]);

  return {
    s3RoleArn,
    dynamoRoleArn,
  };
}

export { ensureApiGatewayExecutionRoles };
