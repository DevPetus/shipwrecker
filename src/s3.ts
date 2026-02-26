import {
    BucketLocationConstraint,
    CreateBucketCommand,
    HeadBucketCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import fs from 'node:fs';
import path from 'node:path';

class S3 {
    private readonly client: S3Client;
    private bucketName = '';
    private readonly region: string;

    constructor(region: string) {
        this.region = region;
        this.client = new S3Client({ region });
    }

    async ensureBucket(bucketName: string): Promise<void> {
        this.bucketName = bucketName;

        try {
            await this.client.send(new HeadBucketCommand({ Bucket: bucketName }));
            return;
        } catch {
            // Create the bucket if it does not exist
        }

        const createParams =
            this.region === 'eu-west-1'
                ? { Bucket: bucketName }
                : {
                        Bucket: bucketName,
                        CreateBucketConfiguration: {
                            LocationConstraint: this.region as BucketLocationConstraint,
                        },
                    };

        await this.client.send(new CreateBucketCommand(createParams));
    }

    async uploadDirectory(directoryPath: string): Promise<void> {
        const absolutePath = path.resolve(directoryPath);
        const entries = fs.readdirSync(absolutePath, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isFile()) {
                continue;
            }

            const filePath = path.join(absolutePath, entry.name);
            const fileStream = fs.createReadStream(filePath);

            await this.client.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: entry.name,
                    Body: fileStream,
                })
            );
        }
    }
}

export { S3 };