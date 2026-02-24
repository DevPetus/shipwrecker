import { createTable, insertShipAttributes, showTables } from './deploy-dynamo';
import { ApiGateway } from './apigateway';
import { ensureApiGatewayExecutionRoles } from './iam-roles';
import { DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";

/* 
    Global for client
    WARNING : CLIENT REGION HARDCODED, TO BE PARAMETERIZED IN THE FUTURE
*/
const client = new DynamoDBClient({ region: "eu-west-1" });

/* Global for table name */
const tableName: string = `ship_table`;

/* Main function to execute deployment */
async function deploy() {
  try {
    console.log('🚀 Starting Project Deployment...');

    console.log('🔋 Creating DynamoDB...');

    /* Create the DynamoDB table */
    createTable(tableName);

    /* Waiting for table to be active before proceeding */
    let tableActive = false;
    while (!tableActive) {
      try {
        const describeTableCommand = new DescribeTableCommand({ TableName: tableName });
        const describeResponse = await client.send(describeTableCommand);
        if (describeResponse.Table && describeResponse.Table.TableStatus === "ACTIVE") {
          tableActive = true;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
        }
      } catch (error) { 
        console.log('❌ Looking for table:', tableName, ' - not found yet, retrying...');
      }
    }

    console.log('📦 Inserting Ship Attributes...');

    /* Insert ship attributes into the table */
    insertShipAttributes(tableName);

    console.log('🌐 Creating API Gateway and endpoints...');

    const roles = await ensureApiGatewayExecutionRoles();

    /* Configure API Gateway dependencies and setup API Gateway */
    ApiGateway.configureDependencies({
      s3BucketName: process.env['S3_BUCKET_NAME'] || 'kfc-bucket',
      dynamoTableName: process.env['DYNAMODB_TABLE_NAME'] || 'ship_table',
      s3RoleArn: roles.s3RoleArn,
      dynamoRoleArn: roles.dynamoRoleArn,
    });

    /* Setup API Gateway and retrieve details */
    const apiGateway = await ApiGateway.setupApiGateway();

    console.log('✅ API Gateway setup complete.');
    console.log(`📌 REST API ID: ${apiGateway.restApiId}`);
    console.log(`🔐 API Key: ${apiGateway.apiToken}`);
    console.log(`🔗 Invoke URL: ${apiGateway.invokeUrl}`);
    console.log('Project deployed...');

    showTables();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deploy();

export { };
