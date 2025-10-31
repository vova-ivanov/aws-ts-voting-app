import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Get the default VPC (this is the VPC being used by the voting app)
const defaultVpc = aws.ec2.getVpc({
  default: true,
});

// Get the subnets used by the voting app
const subnet1 = aws.ec2.getSubnet({
  id: "subnet-01c76b9de5f6854cf", // us-west-2a
});

const subnet2 = aws.ec2.getSubnet({
  id: "subnet-0051b13f2ff8ba3ed", // us-west-2d
});

const subnet3 = aws.ec2.getSubnet({
  id: "subnet-0e8fc6c72938bff93", // us-west-2b
});

const subnet4 = aws.ec2.getSubnet({
  id: "subnet-0acdc16280d847571", // us-west-2c
});

// Import existing security groups
const frontendSecurityGroup = aws.ec2.getSecurityGroup({
  id: "sg-0a92a63e0c36f1ac9",
});

const cacheSecurityGroup = aws.ec2.getSecurityGroup({
  id: "sg-0ad3a30181d7b5fd7",
});

// Imported IAM roles for ECS tasks
const frontendTaskRole = new aws.iam.Role("voting-app-frontend-task-role", {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "ecs-tasks.amazonaws.com",
        },
        Sid: "",
      },
    ],
  }),
  name: "voting-app-frontend-task-ea7e092",
});

const frontendExecutionRole = new aws.iam.Role(
  "voting-app-frontend-execution-role",
  {
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "ecs-tasks.amazonaws.com",
          },
          Sid: "",
        },
      ],
    }),
    managedPolicyArns: [
      "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    ],
    name: "voting-app-frontend-execution-9090e56",
  },
);

const cacheTaskRole = new aws.iam.Role("voting-app-cache-task-role", {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "ecs-tasks.amazonaws.com",
        },
        Sid: "",
      },
    ],
  }),
  name: "voting-app-cache-task-7cc305a",
});

const cacheExecutionRole = new aws.iam.Role("voting-app-cache-execution-role", {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "ecs-tasks.amazonaws.com",
        },
        Sid: "",
      },
    ],
  }),
  managedPolicyArns: [
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
  ],
  name: "voting-app-cache-execution-4905812",
});

// CloudWatch Log Groups (these need to be created to match the existing task definitions)
const frontendLogGroup = new aws.cloudwatch.LogGroup(
  "voting-app-frontend-logs",
  {
    name: "voting-app-frontend-744036f",
    retentionInDays: 7,
  },
);

const cacheLogGroup = new aws.cloudwatch.LogGroup("voting-app-cache-logs", {
  name: "voting-app-cache-470aba0",
  retentionInDays: 7,
});

// Service Discovery namespace and service (create new to match existing)
const serviceDiscoveryNamespace = new aws.servicediscovery.PrivateDnsNamespace(
  "voting-app-namespace",
  {
    name: "voting-app.local",
    vpc: defaultVpc.then((vpc) => vpc.id),
  },
);

const cacheServiceDiscovery = new aws.servicediscovery.Service(
  "voting-app-cache-discovery",
  {
    name: "redis",
    namespaceId: serviceDiscoveryNamespace.id,
    dnsConfig: {
      namespaceId: serviceDiscoveryNamespace.id,
      dnsRecords: [
        {
          ttl: 10,
          type: "A",
        },
      ],
    },
  },
);

// ECS Cluster (imported)
const cluster = new aws.ecs.Cluster("voting-app-cluster", {
  name: "voting-app-cluster-b3a046f",
  settings: [
    {
      name: "containerInsights",
      value: "disabled",
    },
  ],
});

// Task Definitions (imported)
const frontendTaskDefinition = new aws.ecs.TaskDefinition(
  "voting-app-frontend-task",
  {
    containerDefinitions: JSON.stringify([
      {
        environment: [
          { name: "REDIS", value: "redis.voting-app.local" },
          { name: "REDIS_PORT", value: "6379" },
          { name: "REDIS_PWD", value: "1234" },
        ],
        essential: true,
        image:
          "105014798514.dkr.ecr.us-west-2.amazonaws.com/repo-c1b0b00@sha256:61cc287f68e91ecae03adc9371cb154888c535d747ccd75635ab0c7c0858114a",
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-region": "us-west-2",
            "awslogs-stream-prefix": "votingAppFrontend",
            "awslogs-group": "voting-app-frontend-744036f",
          },
        },
        memory: 512,
        mountPoints: [],
        name: "votingAppFrontend",
        portMappings: [{ containerPort: 80, hostPort: 80, protocol: "tcp" }],
        systemControls: [],
        volumesFrom: [],
      },
    ]),
    cpu: "256",
    executionRoleArn: frontendExecutionRole.arn,
    family: "voting-app-frontend-8855d92d",
    memory: "512",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    taskRoleArn: frontendTaskRole.arn,
  },
);

const cacheTaskDefinition = new aws.ecs.TaskDefinition(
  "voting-app-cache-task",
  {
    containerDefinitions: JSON.stringify([
      {
        command: ["redis-server", "--requirepass", "1234"],
        environment: [],
        essential: true,
        image: "redis:alpine",
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": "voting-app-cache-470aba0",
            "awslogs-region": "us-west-2",
            "awslogs-stream-prefix": "redis",
          },
        },
        memory: 512,
        mountPoints: [],
        name: "redis",
        portMappings: [
          { containerPort: 6379, hostPort: 6379, protocol: "tcp" },
        ],
        systemControls: [],
        volumesFrom: [],
      },
    ]),
    cpu: "256",
    executionRoleArn: cacheExecutionRole.arn,
    family: "voting-app-cache-79ac218f",
    memory: "512",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    taskRoleArn: cacheTaskRole.arn,
  },
);

// Load Balancer (imported)
const loadBalancer = new aws.alb.LoadBalancer("voting-app-frontend-lb", {
  accessLogs: {
    bucket: "",
  },
  connectionLogs: {
    bucket: "",
  },
  enableCrossZoneLoadBalancing: true,
  ipAddressType: "ipv4",
  loadBalancerType: "application",
  name: "voting-app-frontend-4cf12c9",
  securityGroups: ["sg-0bf5215704069a725"],
  subnets: [
    subnet1.then((s) => s.id),
    subnet2.then((s) => s.id),
    subnet3.then((s) => s.id),
    subnet4.then((s) => s.id),
  ],
});

// Target Group (need to create to match existing)
const targetGroup = new aws.alb.TargetGroup("voting-app-frontend-tg", {
  name: "voting-app-frontend-7d5741c",
  port: 80,
  protocol: "HTTP",
  vpcId: defaultVpc.then((vpc) => vpc.id),
  targetType: "ip",
  healthCheck: {
    enabled: true,
    healthyThreshold: 5,
    interval: 30,
    matcher: "200",
    path: "/",
    port: "traffic-port",
    protocol: "HTTP",
    timeout: 5,
    unhealthyThreshold: 2,
  },
});

// Load Balancer Listener (need to create)
const listener = new aws.alb.Listener("voting-app-frontend-listener", {
  loadBalancerArn: loadBalancer.arn,
  port: 80,
  protocol: "HTTP",
  defaultActions: [
    {
      type: "forward",
      targetGroupArn: targetGroup.arn,
    },
  ],
});

// ECS Services (imported)
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
        targetGroupArn: targetGroup.arn,
      },
    ],
    name: "voting-app-frontend-76f58d6",
    networkConfiguration: {
      assignPublicIp: true,
      securityGroups: [frontendSecurityGroup.then((sg) => sg.id)],
      subnets: [
        subnet2.then((s) => s.id), // subnet-0051b13f2ff8ba3ed
        subnet1.then((s) => s.id), // subnet-01c76b9de5f6854cf
        subnet4.then((s) => s.id), // subnet-0acdc16280d847571
        subnet3.then((s) => s.id), // subnet-0e8fc6c72938bff93
      ],
    },
    platformVersion: "LATEST",
    propagateTags: "NONE",
    schedulingStrategy: "REPLICA",
    taskDefinition: frontendTaskDefinition.arn,
  },
  {
    dependsOn: [listener],
  },
);

const cacheService = new aws.ecs.Service("voting-app-cache-service", {
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
    securityGroups: [cacheSecurityGroup.then((sg) => sg.id)],
    subnets: [
      subnet2.then((s) => s.id), // subnet-0051b13f2ff8ba3ed
      subnet1.then((s) => s.id), // subnet-01c76b9de5f6854cf
      subnet4.then((s) => s.id), // subnet-0acdc16280d847571
      subnet3.then((s) => s.id), // subnet-0e8fc6c72938bff93
    ],
  },
  platformVersion: "LATEST",
  propagateTags: "NONE",
  schedulingStrategy: "REPLICA",
  serviceRegistries: {
    registryArn: cacheServiceDiscovery.arn,
  },
  taskDefinition: cacheTaskDefinition.arn,
});

// Exports
export const clusterName = cluster.name;
export const loadBalancerDns = loadBalancer.dnsName;
export const frontendServiceName = frontendService.name;
export const cacheServiceName = cacheService.name;
