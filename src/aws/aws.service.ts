import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Logger, Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { S3DeleteObjectsException, S3UploadException } from "./interface/AwsExceptions";


@Injectable()
export class AwsService {
	constructor() { }

	private getS3Config() {
		return {
			region: process.env.AWS_REGION,
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
			}
		}
	}

	private getProjectBucket() {
		return process.env.AWS_BUCKET
	}

	async uploadToS3(file: Express.Multer.File) {
		const target = {
			Bucket: this.getProjectBucket(),
			Key: `${Date.now()}_${file.originalname}`,
			Body: file.buffer,
			ContentType: file.mimetype
		}

		try {
			const parallelUploads3 = new Upload({
				client: new S3Client(this.getS3Config()),
				params: target,
			});

			const uploadDetails = await parallelUploads3.done();
			return uploadDetails.Location
		} catch (e) {
			throw new S3UploadException(e.message)
		}
	}

	async deleteObjects(keys: string | string[]) {
		const args = !Array.isArray(keys) ? [{ Key: keys }] : keys.map((key) => {
			return {
				Key: key
			}
		})

		const command = new DeleteObjectsCommand({
			Bucket: this.getProjectBucket(),
			Delete: {
				Objects: args
			}
		});

		try {
			const client = new S3Client(this.getS3Config())
			await client.send(command)
			return true
		} catch (e) {
			throw new S3DeleteObjectsException(e.message)
		}
	}
}
