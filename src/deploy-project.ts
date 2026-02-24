import { createTable, insertShipAttributes } from './deploy-dynamo';
import { ApiGateway } from './apigateway';
import { ensureApiGatewayExecutionRoles } from './iam-roles';


async function deploy() {
  try {
    console.log('🚀 Starting Project Deployment...');

    const tableName: string = `ShipTable`;

    console.log('🔋 Creating DynamoDB...');

    createTable(tableName);

    console.log('📦 Inserting Ship Attributes...');

    insertShipAttributes(tableName);

    console.log('🌐 Creating API Gateway and endpoints...');

    const roles = await ensureApiGatewayExecutionRoles();

    ApiGateway.configureDependencies({
      s3BucketName: process.env['S3_BUCKET_NAME'] || 'kfc-bucket',
      dynamoTableName: process.env['DYNAMODB_TABLE_NAME'] || 'ShipTable',
      s3RoleArn: roles.s3RoleArn,
      dynamoRoleArn: roles.dynamoRoleArn,
    });

    const apiGateway = await ApiGateway.setupApiGateway();

    console.log('✅ API Gateway setup complete.');
    console.log(`📌 REST API ID: ${apiGateway.restApiId}`);
    console.log(`🔐 API Key: ${apiGateway.apiToken}`);
    console.log(`🔗 Invoke URL: ${apiGateway.invokeUrl}`);
    console.log('Project deployed...');



  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deploy();

export { };
