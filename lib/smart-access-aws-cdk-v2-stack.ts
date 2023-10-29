import {
  Stack,
  StackProps,
  Duration,
  aws_rds as rds,
  aws_ec2 as ec2,
  aws_secretsmanager as secretsManager,
  aws_apigateway as apigateway,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodeJs,
  RemovalPolicy,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { join } from "path";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
const lambdaFolderPath = join(__dirname, "lambda");

export class SmartAccessAwsCdkV2Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "smart-access-vpc", {
      maxAzs: 3,
    });

    const securityGroup = new ec2.SecurityGroup(
      this,
      "smart-access-security-group",
      {
        vpc,
        description: "Allow ssh access to ec2 instances",
        allowAllOutbound: true,
      }
    );

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      "allow postgresql traffic"
    );

    const masterUserSecret = new secretsManager.Secret(
      this,
      "smart-access-db-master-user-secret",
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

    const dbInstance = new rds.DatabaseInstance(this, "smart-access-db", {
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

    const api = new apigateway.RestApi(this, "smart-access-api", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const usersApiRoot = api.root.addResource("users");
    const usersApi = usersApiRoot.addResource("{id}");

    const getAllUsersLambda = new lambdaNodeJs.NodejsFunction(
      this,
      "getAllUsersHandler",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: join(lambdaFolderPath, "users", "getAll.ts"),
        environment: {},
        handler: "index.handler",
      }
    );

    const getAllUsersIntgr = new apigateway.LambdaIntegration(
      getAllUsersLambda
    );

    usersApiRoot.addMethod("GET", getAllUsersIntgr, {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    const createUsersLambda = new lambdaNodeJs.NodejsFunction(
      this,
      "createUserHandler",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: join(lambdaFolderPath, "users", "create.ts"),
        environment: {},
        handler: "index.handler",
      }
    );

    const createUsersIntgr = new apigateway.LambdaIntegration(
      createUsersLambda
    );

    usersApiRoot.addMethod("POST", createUsersIntgr, {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    const getUserLambda = new lambdaNodeJs.NodejsFunction(
      this,
      "getUserHandler",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: join(lambdaFolderPath, "users", "get.ts"),
        environment: {},
        handler: "index.handler",
      }
    );

    const getUserIntgr = new apigateway.LambdaIntegration(getUserLambda);

    usersApi.addMethod("GET", getUserIntgr, {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
  }
}
