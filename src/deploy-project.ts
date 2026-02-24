import { ApiGateway } from './apigateway';





async function deploy() {
  try {
    console.log('🚀 Starting Project Deployment...');
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

export {};
