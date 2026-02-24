import { CreateTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, GetCommand, DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ships } from '../data/ships.json';

const client = new DynamoDBClient({ region: "eu-west-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function createTable(tableName: string) {
    const createTableCommand = new CreateTableCommand({
        TableName: tableName,
        AttributeDefinitions: [
            {
                AttributeName: "id",
                AttributeType: "S",
            },
        ],
        KeySchema: [
            {
                AttributeName: "id",
                KeyType: "HASH",
            },
        ],
        BillingMode: "PAY_PER_REQUEST",
    });

    try {
        const response = await client.send(createTableCommand);
        console.log('✅ Table created:', response.TableDescription?.TableName);
    } catch (error) {
        console.error('❌ Error creating table:', error);
    }
}

async function insertCoffeeItems() {
    const items = ;

    for (const item of items) {
        try {
            const command = new PutCommand({
                TableName: tableName,
                Item: item
            });
            await client.send(command);
            console.log(`✅ Inserted item ${item.name}`);
        } catch (error) {
            console.error(`❌ Error inserting item ${item.name}:`, error);
        }
    }
}