import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Import ECS Cluster
const cluster = new aws.ecs.Cluster(
  "voting-app-cluster",
  {
    name: "voting-app-cluster-b3a046f",
    region: "us-west-2",
    settings: [
      {
        name: "containerInsights",
        value: "disabled",
      },
    ],
  },
  {
    protect: true,
  },
);

// Import IAM roles for ECS tasks
const frontendTaskRole = new aws.iam.Role(
  "voting-app-frontend-task-role",
  {
    assumeRolePolicy:
      '{"Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Sid":""}],"Version":"2012-10-17"}',
    name: "voting-app-frontend-task-ea7e092",
  },
  {
    protect: true,
  },
);

const frontendExecutionRole = new aws.iam.Role(
  "voting-app-frontend-execution-role",
  {
    assumeRolePolicy:
      '{"Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Sid":""}],"Version":"2012-10-17"}',
    managedPolicyArns: [
      "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    ],
    name: "voting-app-frontend-execution-9090e56",
  },
  {
    protect: true,
  },
);

const cacheTaskRole = new aws.iam.Role(
  "voting-app-cache-task-role",
  {
    assumeRolePolicy:
      '{"Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Sid":""}],"Version":"2012-10-17"}',
    name: "voting-app-cache-task-7cc305a",
  },
  {
    protect: true,
  },
);

const cacheExecutionRole = new aws.iam.Role(
  "voting-app-cache-execution-role",
  {
    assumeRolePolicy:
      '{"Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Sid":""}],"Version":"2012-10-17"}',
    managedPolicyArns: [
      "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    ],
    name: "voting-app-cache-execution-4905812",
  },
  {
    protect: true,
  },
);

// Import Load Balancer
const loadBalancer = new aws.alb.LoadBalancer(
  "voting-app-frontend-lb",
  {
    accessLogs: {
      bucket: "",
    },
    connectionLogs: {
      bucket: "",
    },
    enableCrossZoneLoadBalancing: true,
    ipAddressType: aws.alb.IpAddressType.Ipv4,
    loadBalancerType: aws.alb.LoadBalancerType.Application,
    name: "voting-app-frontend-4cf12c9",
    region: "us-west-2",
    securityGroups: ["sg-0bf5215704069a725"],
    subnets: [
      "subnet-0051b13f2ff8ba3ed",
      "subnet-01c76b9de5f6854cf",
      "subnet-0acdc16280d847571",
      "subnet-0e8fc6c72938bff93",
    ],
  },
  {
    protect: true,
  },
);

// Import ECS Task Definitions
const frontendTaskDefinition = new aws.ecs.TaskDefinition(
  "voting-app-frontend-task",
  {
    containerDefinitions:
      '[{"environment":[{"name":"REDIS","value":"redis.voting-app.local"},{"name":"REDIS_PORT","value":"6379"},{"name":"REDIS_PWD","value":"1234"}],"essential":true,"image":"105014798514.dkr.ecr.us-west-2.amazonaws.com/repo-c1b0b00@sha256:61cc287f68e91ecae03adc9371cb154888c535d747ccd75635ab0c7c0858114a","logConfiguration":{"logDriver":"awslogs","options":{"awslogs-group":"voting-app-frontend-744036f","awslogs-region":"us-west-2","awslogs-stream-prefix":"votingAppFrontend"}},"memory":512,"mountPoints":[],"name":"votingAppFrontend","portMappings":[{"containerPort":80,"hostPort":80,"protocol":"tcp"}],"systemControls":[],"volumesFrom":[]}]',
    cpu: "256",
    executionRoleArn: frontendExecutionRole.arn,
    family: "voting-app-frontend-8855d92d",
    memory: "512",
    networkMode: "awsvpc",
    region: "us-west-2",
    requiresCompatibilities: ["FARGATE"],
    taskRoleArn: frontendTaskRole.arn,
  },
  {
    protect: true,
  },
);

const cacheTaskDefinition = new aws.ecs.TaskDefinition(
  "voting-app-cache-task",
  {
    containerDefinitions:
      '[{"command":["redis-server","--requirepass","1234"],"environment":[],"essential":true,"image":"redis:alpine","logConfiguration":{"logDriver":"awslogs","options":{"awslogs-region":"us-west-2","awslogs-stream-prefix":"redis","awslogs-group":"voting-app-cache-470aba0"}},"memory":512,"mountPoints":[],"name":"redis","portMappings":[{"containerPort":6379,"hostPort":6379,"protocol":"tcp"}],"systemControls":[],"volumesFrom":[]}]',
    cpu: "256",
    executionRoleArn: cacheExecutionRole.arn,
    family: "voting-app-cache-79ac218f",
    memory: "512",
    networkMode: "awsvpc",
    region: "us-west-2",
    requiresCompatibilities: ["FARGATE"],
    taskRoleArn: cacheTaskRole.arn,
  },
  {
    protect: true,
  },
);

// Import ECS Services
const frontendService = new aws.ecs.Service(
  "voting-app-frontend-service",
  {
    availabilityZoneRebalancing: "DISABLED",
    cluster: cluster.arn,
    deploymentCircuitBreaker: {
      enable: false,
      rollback: false,
    },
    deploymentConfiguration: {
      bakeTimeInMinutes: "0",
      strategy: "ROLLING",
    },
    deploymentController: {
      type: "ECS",
    },
    desiredCount: 1,
    iamRole: "/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
    launchType: "FARGATE",
    loadBalancers: [
      {
        containerName: "votingAppFrontend",
        containerPort: 80,
        targetGroupArn:
          "arn:aws:elasticloadbalancing:us-west-2:105014798514:targetgroup/voting-app-frontend-7d5741c/a99610a3796c0899",
      },
    ],
    name: "voting-app-frontend-76f58d6",
    networkConfiguration: {
      assignPublicIp: true,
      securityGroups: ["sg-0a92a63e0c36f1ac9"],
      subnets: [
        "subnet-0051b13f2ff8ba3ed",
        "subnet-01c76b9de5f6854cf",
        "subnet-0acdc16280d847571",
        "subnet-0e8fc6c72938bff93",
      ],
    },
    platformVersion: "LATEST",
    propagateTags: "NONE",
    region: "us-west-2",
    schedulingStrategy: "REPLICA",
    taskDefinition: frontendTaskDefinition.arn,
  },
  {
    protect: true,
  },
);

const cacheService = new aws.ecs.Service(
  "voting-app-cache-service",
  {
    availabilityZoneRebalancing: "DISABLED",
    cluster: cluster.arn,
    deploymentCircuitBreaker: {
      enable: false,
      rollback: false,
    },
    deploymentConfiguration: {
      bakeTimeInMinutes: "0",
      strategy: "ROLLING",
    },
    deploymentController: {
      type: "ECS",
    },
    desiredCount: 1,
    iamRole: "/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
    launchType: "FARGATE",
    name: "voting-app-cache-9685347",
    networkConfiguration: {
      assignPublicIp: true,
      securityGroups: ["sg-0ad3a30181d7b5fd7"],
      subnets: [
        "subnet-0051b13f2ff8ba3ed",
        "subnet-01c76b9de5f6854cf",
        "subnet-0acdc16280d847571",
        "subnet-0e8fc6c72938bff93",
      ],
    },
    platformVersion: "LATEST",
    propagateTags: "NONE",
    region: "us-west-2",
    schedulingStrategy: "REPLICA",
    serviceRegistries: {
      registryArn:
        "arn:aws:servicediscovery:us-west-2:105014798514:service/srv-qn5zjov37l3gp77q",
    },
    taskDefinition: cacheTaskDefinition.arn,
  },
  {
    protect: true,
  },
);

// Export important outputs
export const clusterName = cluster.name;
export const loadBalancerDns = loadBalancer.dnsName;
export const frontendServiceName = frontendService.name;
export const cacheServiceName = cacheService.name;
