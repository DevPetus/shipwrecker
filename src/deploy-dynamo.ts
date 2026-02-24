import { CreateTableCommand, DynamoDBClient, DescribeTableCommand, ListTablesCommand } from "@aws-sdk/client-dynamodb";
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
        /* Loop through tables and display their properties */
        if (tables.TableNames) {
            for (const table of tables.TableNames) {
                /* Get table properties from name */
                const describeTableCommand = new DescribeTableCommand({ TableName: table });
                const describeResponse = await client.send(describeTableCommand);

                console.log("id :", describeResponse.Table?.AttributeDefinitions?.find(attr => attr.AttributeName === "id")?.AttributeName);
                console.log("nom :", describeResponse.Table?.AttributeDefinitions?.find(attr => attr.AttributeName === "nom")?.AttributeName);
                console.log("type :", describeResponse.Table?.AttributeDefinitions?.find(attr => attr.AttributeName === "type")?.AttributeName);
                console.log("pavillon :", describeResponse.Table?.AttributeDefinitions?.find(attr => attr.AttributeName === "pavillon")?.AttributeName);
                console.log("taille :", describeResponse.Table?.AttributeDefinitions?.find(attr => attr.AttributeName === "taille")?.AttributeName);
                console.log("nombre_marins :", describeResponse.Table?.AttributeDefinitions?.find(attr => attr.AttributeName === "nombre_marins")?.AttributeName);
            }
        }
    } catch (error) {
        console.error('❌ Error listing tables:', error);
    }
}

export { createTable, insertShipAttributes, showTables };