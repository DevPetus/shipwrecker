import { CreateTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, GetCommand, DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import * as ships from '../data/ships.json';

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

async function insertShipAttributes(tableName: string) {
    for (const ship of ships) {
        try {
            const command = new PutCommand({
                TableName: tableName,
                Item: ship
            });
            await client.send(command);
            console.log(`✅ Inserted item ${ship.nom.S}`);
        } catch (error) {
            console.error(`❌ Error inserting item ${ship.nom.S}:`, error);
        }
    }
}

async function deleteTable(tableName: string) {
    try {
        const { DeleteTableCommand } = await import("@aws-sdk/client-dynamodb");
        const deleteTableCommand = new DeleteTableCommand({ TableName: tableName });
        await client.send(deleteTableCommand);
        console.log('✅ Table deleted');
    } catch (error) {
        console.error('❌ Error deleting table:', error);
    }
}