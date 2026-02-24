import { ApiGateway } from './apigateway';
import { nukeTables } from './destroy-dynamo';

// Main function to execute destructive operation
async function main() {
  try {
    console.log('🚀 Starting Project Deletion...');

    await ApiGateway.destroyApiGateway();

    await nukeTables();
    console.log('Project deleted...');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Execute the main function
main();

// Export to make this a module and avoid global scope conflicts
export { };
