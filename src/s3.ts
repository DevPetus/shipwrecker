import {
    CopyObjectCommand,
    CopyObjectCommandInput,
    CreateBucketCommand,
    CreateBucketCommandInput,
    DeleteBucketCommand,
    DeleteBucketCommandInput,
    DeleteObjectCommand,
    DeleteObjectCommandInput,
    ListObjectsV2Command,
    ListObjectsV2CommandInput,
    S3Client,
    S3ClientConfig
} from "@aws-sdk/client-s3"

class S3 {
    config : S3ClientConfig = {};
    client : S3Client = new S3Client(this.config);
    name : string = "";
    location : string = "";

    async createBucket(name : string) {
        this.name = name;
        
        const input : CreateBucketCommandInput = {
            Bucket: name
        };
        const command = new CreateBucketCommand(input);
        const response = await this.client.send(command);

        this.location = response.Location!;

        return response;
    }

    async copyLocalFileToBucket(key : string) {
        const input : CopyObjectCommandInput = {
            Bucket: this.name,
            CopySource: '.',
            Key: key
        };
        const command = new CopyObjectCommand(input);
        const response = await this.client.send(command);
        
        return response;
    }

    async copyBucketFileToLocal(key : string) {
        const input : CopyObjectCommandInput = {
            Bucket: this.name,
            CopySource: '.',
            Key: key
        };
        const command = new CopyObjectCommand(input);
        const response = await this.client.send(command);

        return response;
    }

    async deleteBucket() {
        const input : DeleteBucketCommandInput = {
            Bucket: this.name
        };
        const command = new DeleteBucketCommand(input);
        const response = await this.client.send(command);

        return response;
    }
    
    async deleteFromBucket(key : string) {
        const input : DeleteObjectCommandInput = {
            Bucket: this.name,
            Key: key
        };
        const command = new DeleteObjectCommand(input);
        const response = await this.client.send(command);

        return response;
    }

    async clearBucket() {
        const input : ListObjectsV2CommandInput = {
            Bucket: this.name
        }
        const command = new ListObjectsV2Command(input);
        const response = await this.client.send(command);

        if (response.Contents !== undefined && response.Contents !== null) {
            for (let object of response.Contents!) {
                this.deleteFromBucket(object.Key!);
            }
        }
    }
}

export { S3 };