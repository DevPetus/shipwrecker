import { CreateTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import * as ships from '../data/ships.json';

const client = new DynamoDBClient({ region: "eu-west-1" });
// const docClient = DynamoDBDocumentClient.from(client);

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
    if (ships) {
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
    else { console.log('No ship data found to insert.'); }
}

// async function showTables() {
//     try {
//         const { ListTablesCommand } = await import("@aws-sdk/client-dynamodb");
//         const listTablesCommand = new ListTablesCommand({});
//         const table = await client.send(listTablesCommand);
//         console.log('📋 Tables:', tables.TableNames);
//         for (const table of tables.TableNames) {
//             console.log("id :", table.S.id");
//             console.log("nom :", nom);
//             console.log("type :", type);
//             console.log("pavillon :", pavillon);
//             console.log("taille :", taille);
//             console.log("nombre_marins :", nombre_marins);
//         }
//     } catch (error) {
//         console.error('❌ Error listing tables:', error);
//     }
// }

export { createTable, insertShipAttributes };