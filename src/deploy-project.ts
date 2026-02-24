import { createTable, insertShipAttributes } from './deploy-dynamo';
import { ApiGateway } from './apigateway';
import { S3 } from './s3';


async function deploy() {
  try {
    console.log('🚀 Starting Project Deployment...');

    const tableName: string = `ShipTable`;

    console.log('🔋 Creating DynamoDB...');

    createTable(tableName);

    console.log('📦 Inserting Ship Attributes...');

    insertShipAttributes(tableName);

    console.log('🌐 Creating API Gateway and endpoints...');

    ApiGateway.configureDependencies({
      s3BucketName: process.env['S3_BUCKET_NAME'] || 'kfc-bucket',
      dynamoTableName: process.env['DYNAMODB_TABLE_NAME'] || 'ShipTable',
      s3RoleArn: process.env['APIGATEWAY_S3_ROLE_ARN'] || 'APIGatewayS3ServiceRole',
      dynamoRoleArn: process.env['APIGATEWAY_DYNAMODB_ROLE_ARN'] || 'APIGatewayDynamoDBServiceRole',
    });

    const apiGateway = await ApiGateway.setupApiGateway();

    console.log('✅ API Gateway setup complete.');
    console.log(`📌 REST API ID: ${apiGateway.restApiId}`);
    console.log(`🔐 API Key: ${apiGateway.apiToken}`);
    console.log(`🔗 Invoke URL: ${apiGateway.invokeUrl}`);
    console.log('Project deployed...');

    const s3 = new S3();
    s3.createBucket("test");

    s3.createBucket("bucket");
    s3.deleteBucket();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deploy();

export { };
