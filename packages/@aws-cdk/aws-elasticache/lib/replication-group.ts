import * as ec2 from '@aws-cdk/aws-ec2';
import * as kms from '@aws-cdk/aws-kms';
import { IResource, RemovalPolicy, Resource, Token } from '@aws-cdk/core';
import { Construct } from 'constructs';
import { CfnReplicationGroup } from './elasticache.generated';
import { Endpoint } from './endpoint';
import { IParameterGroup } from './parameter-group';
import { ISubnetGroup, SubnetGroup } from './subnet-group';


/**
 * Create a Redshift Cluster with a given number of nodes.
 * Implemented by {@link ReplicationGroup} via {@link ReplicationGroupBase}.
 */
export interface IReplicationGroup extends IResource, ec2.IConnectable {
  /**
   * Name of the replication group id
   *
   * @attribute Id
   */
  readonly replicationGroupId: string;

  /**
   * The endpoint to use for read/write operations
   *
   * @attribute EndpointAddress,EndpointPort
   */
  readonly primaryEndpoint: Endpoint;

  /**
   * The endpoint to use for read operations
   *
   * @attribute EndpointAddress,EndpointPort
   */
  readonly readerEndpoint: Endpoint;
}

/**
 * Properties that describe an existing cluster instance
 */
export interface ReplicationGroupAttributes {
  /**
   * The security groups of the redshift cluster
   *
   * @default no security groups will be attached to the import
   */
  readonly securityGroups?: ec2.ISecurityGroup[];

  /**
   * Identifier for the replication group
   */
  readonly replicationGroupId: string;

  /**
   * Primary read-write endpoint address of the cache node
   */
  readonly primaryEndpointAddress: string;

  /**
   * Primary read-write endpoint port of the cache node
   */
  readonly primaryEndpointPort: number;

  /**
   * Primary read endpoint address of the cache node
   */
  readonly readerEndpointAddress: string;

  /**
   * Primary read endpoint port of the cache node
   */
  readonly readerEndpointPort: number;
}

/**
 * A new or imported clustered database.
 */
abstract class ReplicationGroupBase extends Resource implements IReplicationGroup {
  /**
   * Id of the replication group
   */
  public abstract readonly replicationGroupId: string;

  /**
   * The endpoint to use for read/write operations
   */
  public abstract readonly primaryEndpoint: Endpoint;

  /**
   * The endpoint to use for read-only operations
   */
  public abstract readonly readerEndpoint: Endpoint;

  /**
   * Access to the network connections
   */
  public abstract readonly connections: ec2.Connections;

  /**
   * Renders the secret attachment target specifications.
   *
   * waiting for https://github.com/aws-cloudformation/aws-cloudformation-coverage-roadmap/issues/252
   */
  // public asSecretAttachmentTarget(): secretsmanager.SecretAttachmentTargetProps {
  //   return {
  //     targetId: this.replicationGroupId,
  //     targetType: secretsmanager.AttachmentTargetType.REDIS,
  //   };
  // }
}

/**
 * The version number of the cache engine to be used for the clusters in this replication group.
 * see `aws elasticache describe-cache-engine-versions` for available engine versions
 */
export enum EngineVersion {
  REDIS_5_0_5 = '5.0.5',
  REDIS_5_0_6 = '5.0.6',
  REDIS_6_X = '6.x',
}

/**
 * Properties for a new Replication Group
 */
export interface ReplicationGroupProps {
  /**
   * An optional identifier for the replication group
   *
   * @default - A name is automatically generated.
   */
  readonly replicationGroupName?: string;

  /**
   * A description for the replication group
   *
   * @default - A name is automatically generated.
   */
  readonly description?: string;

  /**
   * The engine version to use for clusters and replication groups
   *
   * @default - undefined
   */
  readonly engineVersion?: EngineVersion;

  /**
   * Additional parameters to pass to the database engine
   * https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/ParameterGroups.html
   *
   * @default - No parameter group.
   */
  readonly parameterGroup?: IParameterGroup;

  /**
   * Number of node groups (shards) in redis replication group (cluster mode enabled).
   * When cluster mode is disabled either omit this parameter or set it to 1.
   *
   * @default - 2 if `clusterModeEnabled` is true, otherwise 1
   */
  readonly numberOfNodeGroups?: number;

  /**
   * Number of clusters in this replication group.
   * Not used, if there is more than one Node Group (shard) - use {@link ReplicationGroupProps.replicasPerNodeGroup} instead
   *
   * @default undefined - not used
   */
  readonly numberOfCacheClusters?: number;

  /**
   * Number of replica nodes in each node group (shard).
   * Valid values are 0 to 5.
   *
   * @default - 1, if `multiAzEnabled` is true, otherwise 0
   */
  readonly replicasPerNodeGroup?: number;

  /**
   * A  flag indicating if you have Multi-AZ enabled to enhance fault tolerance.
   *
   * @default false
   */
  readonly multiAzEnabled?: boolean;

  /**
   * Specifies whether a read-only replica is automatically promoted to read/write primary if the existing primary fails.
   *
   * @default true, if `clusterModeEnabled` else false
   */
  readonly automaticFailoverEnabled?: boolean;

  /**
   * Whether cluster mode is enabled for redis
   *
   * @default false
   */
  readonly clusterModeEnabled?: boolean;

  /**
   * The cache node type to be provisioned for the repliaction group.
   *
   * @default t3.micro, or more precisely cache.t3.micro
   */
  readonly nodeType?: ec2.InstanceType;

  /**
   * What port to listen on
   *
   * @default - The default for the engine is used.
   */
  readonly port?: number;

  /**
   * Whether to enable encryption of data at rest in the repliaction group.
   *
   * @default true for redis 3.2.6, otherwise false
   */
  readonly atRestEncrypted?: boolean;

  /**
   * The KMS key to use for encryption of data at rest.
   *
   * @default - AWS-managed key, if encryption at rest is enabled
   */
  readonly encryptionKey?: kms.IKey;

  /**
   * A preferred maintenance window day/time range. Should be specified as a range ddd:hh24:mi-ddd:hh24:mi (24H Clock UTC).
   *
   * Example: 'sun:23:45-mon:00:15'
   *
   * @default - undefined
   */
  readonly preferredMaintenanceWindow?: string;

  /**
   * The daily time range (in UTC) during which ElastiCache begins taking a daily snapshot of your node group (shard).
   * Example: 05:00-09:00
   *
   * @default - undefined
   */
  readonly snapshotWindow?: string;

  /**
   * The number of days for which ElastiCache retains automatic snapshots before deleting them.
   *
   * @default - undefined
   */
  readonly snapshotRetentionLimit?: number;

  /**
   * The VPC to place the repliaction group in.
   * Use this to place a repliaction group into a vpc.
   */
  readonly vpc: ec2.IVpc;

  /**
   * Where to place the instances within the VPC
   *
   * @default - private subnets
   */
  readonly vpcSubnets?: ec2.SubnetSelection;

  /**
   * Security group. Use, if the replication group is placed inside a VPC.
   *
   * @default - if `vpc` is populated a new security group is created
   */
  readonly securityGroups?: ec2.ISecurityGroup[];

  /**
   * A cluster subnet group to use with this cluster.
   *
   * @default - a new subnet group will be created.
   */
  readonly subnetGroup?: ISubnetGroup;

  /**
   * The removal policy to apply when the cluster and its instances are removed
   * from the stack or replaced during an update.
   *
   * @default RemovalPolicy.DESTROY
   */
  readonly removalPolicy?: RemovalPolicy;

  /**
   * Whether to make cluster publicly accessible.
   *
   * @default false
   */
  readonly publiclyAccessible?: boolean;
}

/**
 * Create a Replication Group a given number of nodes.
 *
 * @resource AWS::ElastiCache::ReplicationGroup
 */
export class ReplicationGroup extends ReplicationGroupBase {
  /**
   * Import an existing DatabaseCluster from properties
   */
  public static fromReplicationGroupAttributes(scope: Construct, id: string, attrs: ReplicationGroupAttributes): IReplicationGroup {
    class Import extends ReplicationGroupBase {
      public readonly connections = new ec2.Connections({
        securityGroups: attrs.securityGroups,
        defaultPort: ec2.Port.tcp(attrs.primaryEndpointPort),
      });
      public readonly replicationGroupId = attrs.replicationGroupId;
      public readonly instanceIdentifiers: string[] = [];
      public readonly primaryEndpoint = new Endpoint(attrs.primaryEndpointAddress, attrs.primaryEndpointPort);
      public readonly readerEndpoint = new Endpoint(attrs.readerEndpointAddress, attrs.readerEndpointPort);
    }

    return new Import(scope, id);
  }

  /**
   * Identifier of the repliaction group
   */
  public readonly replicationGroupId: string;

  /**
   * The endpoint to use for read/write operations
   */
  public readonly primaryEndpoint: Endpoint;

  /**
   * The endpoint to use for read operations
   */
  public readonly readerEndpoint: Endpoint;

  /**
   * Access to the network connections
   */
  public readonly connections: ec2.Connections;

  /**
   * The VPC where the DB subnet group is created.
   */
  private readonly vpc: ec2.IVpc;

  /**
   * The subnets used by the DB subnet group.
   */
  private readonly vpcSubnets: ec2.SubnetSelection;
  /**
   * The engine type of the cache replication group
   */
  private readonly engineType: string = 'redis';

  constructor(scope: Construct, id: string, props: ReplicationGroupProps) {
    super(scope, id);

    const removalPolicy = props.removalPolicy ?? RemovalPolicy.DESTROY;

    this.vpc = props.vpc;

    this.vpcSubnets = props.vpcSubnets ?? {
      subnetType: ec2.SubnetType.PRIVATE,
    };

    const subnetGroup =
      props.subnetGroup ??
      new SubnetGroup(this, 'Subnets', {
        description: `Subnets for ${id} ElastiCache Replication Group`,
        vpc: this.vpc,
        vpcSubnets: this.vpcSubnets,
        removalPolicy: removalPolicy,
      });

    const securityGroups = props.securityGroups ?? [
      new ec2.SecurityGroup(this, 'SecurityGroup', {
        description: 'ElastiCache SG',
        vpc: this.vpc,
      }),
    ];

    const vpcConfiguration = {
      subnetGroup,
      securityGroups,
    };

    this.validateNodeCount(props);

    if (props.atRestEncrypted === false && props.encryptionKey !== undefined) {
      throw new Error('Cannot set property encryptionKey without enabling encryption!');
    }

    const instanceType = props.nodeType || ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO);

    const replicationGroup = new CfnReplicationGroup(this, 'Resource', {
      // Basic
      autoMinorVersionUpgrade: undefined, // currently disabled, see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticache-replicationgroup.html#cfn-elasticache-replicationgroup-autominorversionupgrade
      replicationGroupDescription: props.description || 'CDK generated replication group',
      replicationGroupId: props.replicationGroupName,
      securityGroupIds: vpcConfiguration.securityGroups.map((sg) => sg.securityGroupId),
      cacheSubnetGroupName: vpcConfiguration.subnetGroup.subnetGroupName,
      port: props.port,
      cacheParameterGroupName: props.parameterGroup && props.parameterGroup.parameterGroupName,
      // Admin
      preferredMaintenanceWindow: props.preferredMaintenanceWindow,
      cacheNodeType: cacheNodeInstanceType(instanceType),
      engine: this.engineType,
      engineVersion: props.engineVersion,
      snapshotWindow: props.snapshotWindow,
      snapshotRetentionLimit: props.snapshotRetentionLimit,
      // Cluster & Scaling
      automaticFailoverEnabled: props.clusterModeEnabled || props.automaticFailoverEnabled || props.multiAzEnabled || false,
      numCacheClusters: props.numberOfCacheClusters,
      numNodeGroups: props.numberOfNodeGroups || props.clusterModeEnabled ? 2 : 1,
      replicasPerNodeGroup: props.replicasPerNodeGroup || props.multiAzEnabled ? 1 : 0,
      multiAzEnabled: props.multiAzEnabled,
      // Encryption
      kmsKeyId: props.encryptionKey && props.encryptionKey.keyArn,
      atRestEncryptionEnabled: props.atRestEncrypted ?? true,
    });

    replicationGroup.applyRemovalPolicy(removalPolicy, {
      applyToUpdateReplacePolicy: true,
    });

    this.replicationGroupId = replicationGroup.ref;

    // create a number token that represents the port of the cluster
    const portAttribute = Token.asNumber(replicationGroup.attrPrimaryEndPointPort);
    this.primaryEndpoint = new Endpoint(replicationGroup.attrPrimaryEndPointAddress, portAttribute);

    // create a number token that represents the port of the cluster
    const readerPortAttribute = Token.asNumber(replicationGroup.attrReaderEndPointPort);
    this.readerEndpoint = new Endpoint(replicationGroup.attrReaderEndPointAddress, readerPortAttribute);

    const defaultPort = ec2.Port.tcp(this.primaryEndpoint.port);
    this.connections = new ec2.Connections({ securityGroups: vpcConfiguration.securityGroups, defaultPort });
  }

  private validateNodeCount(props: ReplicationGroupProps): void {
    if (props.numberOfCacheClusters && (props.numberOfNodeGroups || props.replicasPerNodeGroup)) {
      throw new Error(
        'Property NumCacheCluster cannot be defined along with Properties NumNodeGroups, ReplicasPerNodeGroup or NodeGroupConfiguration',
      );
    }
    if (props.clusterModeEnabled) {
      if (props.multiAzEnabled === false) {
        throw new Error('multiAZEnabled must be true, if clusterModeEnabled.');
      }
      if (props.numberOfNodeGroups !== undefined && props.numberOfNodeGroups === 1) {
        throw new Error('Number of node groups must be >2 when cluster mode is enabled');
      }
      if (props.automaticFailoverEnabled === false) {
        throw new Error('automaticFailoverEnabled must be true when clusterModeEnabled is true.');
      }
    }
    if (props.multiAzEnabled && props.automaticFailoverEnabled === false) {
      throw new Error('Automatic Failover cannot be disabled for Multi-AZ enabled Replication Group');
    }
    if (props.multiAzEnabled && props.replicasPerNodeGroup !== undefined && props.replicasPerNodeGroup < 1) {
      throw new Error('Must have at least one replica, if multiAZEnaled is true');
    }
  }
}

/**
 * Turn a regular instance type into a cache node instance type
 */
function cacheNodeInstanceType(instanceType: ec2.InstanceType) {
  return 'cache.' + instanceType.toString();
}
