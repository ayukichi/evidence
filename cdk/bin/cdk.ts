#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EvidenceDelivery } from '../lib/evidence-delivery';

const app = new cdk.App();
new EvidenceDelivery(app, 'EvidenceDeliveryStack', {});
