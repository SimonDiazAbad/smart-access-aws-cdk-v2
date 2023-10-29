import {
  Stack,
  StackProps,
  Duration,
  aws_rds as rds,
  aws_ec2 as ec2,
  aws_secretsmanager as secretsManager,
  aws_apigateway as apigateway,
  RemovalPolicy,
} from "aws-cdk-lib";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class SmartAccessAwsCdkV2Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "MyVPC", {
      maxAzs: 3,
    });

    const securityGroup = new ec2.SecurityGroup(this, "MySecurityGroup", {
      vpc,
      description: "Allow ssh access to ec2 instances",
      allowAllOutbound: true,
    });

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      "allow postgresql traffic"
    );

    const masterUserSecret = new secretsManager.Secret(
      this,
      "db-master-user-secret",
      {
        secretName: "db-master-user-secret",
        description: "Database master user credentials",
        generateSecretString: {
          secretStringTemplate: JSON.stringify({ username: "postgres" }),
          generateStringKey: "password",
          passwordLength: 16,
          excludePunctuation: true,
        },
      }
    );

    const dbInstance = new rds.DatabaseInstance(this, "DBInstance", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      vpc,
      securityGroups: [securityGroup],
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      port: 5432,
      databaseName: "smart_access_db",
      backupRetention: Duration.days(0),
      credentials: rds.Credentials.fromSecret(masterUserSecret),
      deleteAutomatedBackups: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const apiGatewayName =
      process.env.ENVIRONMENT === "production"
        ? "prod-smart-access-api"
        : "stag-smart-access-api";

    const api = new apigateway.RestApi(this, apiGatewayName, {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });
  }
}
