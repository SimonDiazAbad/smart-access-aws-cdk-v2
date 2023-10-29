#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SmartAccessAwsCdkV2Stack } from "../lib/smart-access-aws-cdk-v2-stack";

const app = new cdk.App();
new SmartAccessAwsCdkV2Stack(app, "SmartAccessAwsCdkV2Stack", {
  env: {
    region: "us-east-1",
  },
});
