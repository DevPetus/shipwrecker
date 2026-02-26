import { CreateTableCommand, DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import * as ships from '../data/ships.json';

const client = new DynamoDBClient({ region: "eu-west-1" });

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
    const shipArray = Array.isArray((ships as any).default) ? (ships as any).default : ships;
    if (shipArray) {
        for (const ship of shipArray) {
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
    else { console.log('No ship data found to insert.'); }
}

async function showTables() {
    try {

        const listTablesCommand = new ListTablesCommand({});
        const tables = await client.send(listTablesCommand);
        console.log('📋 Tables:', tables.TableNames);
    } catch (error) {
        console.error('❌ Error listing tables:', error);
    }
}

export { createTable, insertShipAttributes, showTables };