import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

export class EvidenceDelivery extends cdk.Stack {
    constructor(scope: Construct, id: string, props: cdk.StackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, 'EvidenceDeliveryBucker', {
            bucketName: 'evidence-delivery-bucket',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        })

        const distiribution = new cloudfront.Distribution(this, 'EvidenceDeliveryDistribution', {
            defaultBehavior: {
                origin: new cloudfront.origins.S3Origin(bucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            defaultRootObject: 'index.html',
        });

        new cdk.CfnOutput(this, 'BucketName', {
            value: bucket.bucketName,
            description: 'The name of the S3 bucket',
            exportName: 'BucketName',
        });
    }
}
