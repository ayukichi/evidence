import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

export class EvidenceDelivery extends cdk.Stack {
    constructor(scope: Construct, id: string, props: cdk.StackProps) {
        super(scope, id, props);
        const bucket = new s3.Bucket(this, 'EvidenceDeliveryBucket', {
            bucketName: 'evidence-delivery-bucket',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        });

        const oac = new cloudfront.CfnOriginAccessControl(this, 'OAC', {
            originAccessControlConfig: {
                name: 'EvidenceDeliveryOAC',
                originAccessControlOriginType: 's3',
                signingBehavior: 'always',
                signingProtocol: 'sigv4',
            },
        });

        const dirIndexFunction = new cloudfront.CfnFunction(
            this,
            'DirIndexFunction',
            {
                name: 'DirIndexFunction',
                autoPublish: true,
                functionConfig: {
                    comment: 'Function to add index.html to directory requests',
                    runtime: 'cloudfront-js-1.0',
                },
                functionCode: `
                    function handler(event) {
                        var request = event.request;
                        var uri = request.uri;

                        // URLの末尾がスラッシュで終わる場合
                        if (uri.endsWith('/')) {
                            request.uri += 'index.html';
                        }
                        // ファイル拡張子がない場合
                        else if (!uri.includes('.')) {
                            request.uri += '/index.html';
                        }

                    return request;
                }`
            }
        )

        const distribution = new cloudfront.CfnDistribution(
            this,
            'EvidenceDeliveryDistribution',
            {
                distributionConfig: {
                    enabled: true,
                    defaultRootObject: 'index.html',
                    origins: [
                        {
                            id: 'S3Origin',
                            domainName: bucket.bucketRegionalDomainName,
                            s3OriginConfig: {},
                            originAccessControlId: oac.ref,
                        },
                    ],
                    defaultCacheBehavior: {
                        targetOriginId: 'S3Origin',
                        viewerProtocolPolicy: 'redirect-to-https',
                        allowedMethods: ['GET', 'HEAD'],
                        cachedMethods: ['GET', 'HEAD'],
                        forwardedValues: {
                            queryString: false,
                            cookies: {
                                forward: 'none',
                            },
                        },
                        functionAssociations: [
                            {
                                eventType: 'viewer-request',
                                functionArn: dirIndexFunction.ref
                            }
                        ]

                    }
                }
            }
        )

        bucket.addToResourcePolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ['s3:GetObject'],
                resources: [bucket.arnForObjects('*')],
                principals: [new cdk.aws_iam.ServicePrincipal('cloudfront.amazonaws.com')],
                conditions: {
                    StringEquals: {
                        'AWS:SourceArn': `arn:aws:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${distribution.ref}`,
                    },
                },
            })
        );
    }
}
