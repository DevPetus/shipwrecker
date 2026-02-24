import { createTable, insertShipAttributes } from './deploy-dynamo';
import { ApiGateway } from './apigateway';


async function deploy() {
  try {
    console.log('🚀 Starting Project Deployment...');

    const tableName: string = `ShipTable`;

    console.log('🔋 Creating DynamoDB...');

    createTable(tableName);

    console.log('📦 Inserting Ship Attributes...');

    insertShipAttributes(tableName);

    console.log('🌐 Creating API Gateway and endpoints...');

    const apiGateway = await ApiGateway.setupApiGateway();

    console.log('✅ API Gateway setup complete.');
    console.log(`📌 REST API ID: ${apiGateway.restApiId}`);
    console.log(`🔗 Invoke URL: ${apiGateway.invokeUrl}`);
    console.log('Project deployed...');



  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deploy();

export { };
