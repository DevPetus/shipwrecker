import { DeleteTableCommand, DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: "eu-west-1" });


async function nukeTables() {
    try {
        const listTablesCommand = new ListTablesCommand({});
        const tables = await client.send(listTablesCommand);
        if (tables) {
            for (const table in tables) {
                deleteTable(table);
            }
        } else { console.log('No tables found to delete.'); }
    } catch (error) {
        console.error('❌ Error listing tables:', error);
    }
}

async function deleteTable(tableName: string) {
    try {
        const deleteTableCommand = new DeleteTableCommand({ TableName: tableName });
        await client.send(deleteTableCommand);
        console.log('✅ Table deleted : ', tableName);
    } catch (error) {
        console.error('❌ Error deleting table:', error);
    }
}

export { nukeTables };