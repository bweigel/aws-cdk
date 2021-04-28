import { expect as cdkExpect, haveResource, haveResourceLike, ResourcePart } from '@aws-cdk/assert-internal';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as kms from '@aws-cdk/aws-kms';
import * as cdk from '@aws-cdk/core';
import { CacheParameterGroupFamily, ParameterGroup, ReplicationGroup, ReplicationGroupProps, SubnetGroup } from '../lib';
import { CfnReplicationGroup } from '../lib/elasticache.generated';

let stack: cdk.Stack;
let vpc: ec2.IVpc;

beforeEach(() => {
  stack = testStack();
  vpc = new ec2.Vpc(stack, 'VPC');
});
test('Instantiation works', () => {
  // WHEN
  new ReplicationGroup(stack, 'rg', { vpc });

  // THEN
  cdkExpect(stack).to(
    haveResource(
      'AWS::ElastiCache::ReplicationGroup',
      {
        Properties: {
          ReplicationGroupDescription: 'CDK generated replication group',
          SecurityGroupIds: [{ 'Fn::GetAtt': ['rgSecurityGroupB0616ED0', 'GroupId'] }],
          CacheSubnetGroupName: { Ref: 'rgSubnets1C382CB2' },
          CacheNodeType: 'cache.t3.micro',
          Engine: 'redis',
          AutomaticFailoverEnabled: false,
          NumNodeGroups: 1,
          ReplicasPerNodeGroup: 0,
          AtRestEncryptionEnabled: true,
        },
        DeletionPolicy: 'Delete',
        UpdateReplacePolicy: 'Delete',
      },
      ResourcePart.CompleteDefinition,
    ),
  );

  cdkExpect(stack).to(
    haveResource(
      'AWS::ElastiCache::SubnetGroup',
      {
        Properties: {
          Description: 'Subnets for rg ElastiCache Replication Group',
          SubnetIds: [
            { Ref: 'VPCPrivateSubnet1Subnet8BCA10E0' },
            { Ref: 'VPCPrivateSubnet2SubnetCFCDAA7A' },
            { Ref: 'VPCPrivateSubnet3Subnet3EDCD457' },
          ],
        },
        DeletionPolicy: 'Delete',
        UpdateReplacePolicy: 'Delete',
      },
      ResourcePart.CompleteDefinition,
    ),
  );
});

test('Multi-AZ Setup has an additional replica', () => {
  // WHEN
  new ReplicationGroup(stack, 'rg', { vpc, multiAzEnabled: true });

  // THEN
  cdkExpect(stack).to(
    haveResource(
      'AWS::ElastiCache::ReplicationGroup',
      {
        Properties: {
          ReplicationGroupDescription: 'CDK generated replication group',
          SecurityGroupIds: [{ 'Fn::GetAtt': ['rgSecurityGroupB0616ED0', 'GroupId'] }],
          CacheSubnetGroupName: { Ref: 'rgSubnets1C382CB2' },
          CacheNodeType: 'cache.t3.micro',
          Engine: 'redis',
          AutomaticFailoverEnabled: true,
          MultiAZEnabled: true,
          NumNodeGroups: 1,
          ReplicasPerNodeGroup: 1,
          AtRestEncryptionEnabled: true,
        },
        DeletionPolicy: 'Delete',
        UpdateReplacePolicy: 'Delete',
      },
      ResourcePart.CompleteDefinition,
    ),
  );

  cdkExpect(stack).to(
    haveResource(
      'AWS::ElastiCache::SubnetGroup',
      {
        Properties: {
          Description: 'Subnets for rg ElastiCache Replication Group',
          SubnetIds: [
            { Ref: 'VPCPrivateSubnet1Subnet8BCA10E0' },
            { Ref: 'VPCPrivateSubnet2SubnetCFCDAA7A' },
            { Ref: 'VPCPrivateSubnet3Subnet3EDCD457' },
          ],
        },
        DeletionPolicy: 'Delete',
        UpdateReplacePolicy: 'Delete',
      },
      ResourcePart.CompleteDefinition,
    ),
  );
});

test('can create a ReplicationGroup with imported vpc and security group', () => {
  // GIVEN
  vpc = ec2.Vpc.fromLookup(stack, 'ImportedVPC', {
    vpcId: 'VPC12345',
  });
  const sg = ec2.SecurityGroup.fromSecurityGroupId(stack, 'SG', 'SecurityGroupId12345');

  // WHEN
  new ReplicationGroup(stack, 'ReplicationGroup', {
    vpc,
    securityGroups: [sg],
  });

  // THEN
  cdkExpect(stack).to(
    haveResource('AWS::ElastiCache::ReplicationGroup', {
      CacheSubnetGroupName: { Ref: 'ReplicationGroupSubnets373332D6' },
      SecurityGroupIds: ['SecurityGroupId12345'],
    }),
  );
});

// describe('node count', () => {
//   test('Single Node ReplicationGroups do not define node count', () => {
//     // WHEN
//     new ReplicationGroup(stack, 'ReplicationGroup', {
//       vpc,
//       ReplicationGroupType: ReplicationGroupType.SINGLE_NODE,
//     });

//     // THEN
//     cdkExpect(stack).to(
//       haveResource('AWS::ReplicationGroup::ReplicationGroup', {
//         ReplicationGroupType: 'single-node',
//         NumberOfNodes: ABSENT,
//       }),
//     );
//   });

//   test('Single Node ReplicationGroups treat 1 node as undefined', () => {
//     // WHEN
//     new ReplicationGroup(stack, 'ReplicationGroup', {
//       vpc,
//       ReplicationGroupType: ReplicationGroupType.SINGLE_NODE,
//       numberOfNodes: 1,
//     });

//     // THEN
//     cdkExpect(stack).to(
//       haveResource('AWS::ReplicationGroup::ReplicationGroup', {
//         ReplicationGroupType: 'single-node',
//         NumberOfNodes: ABSENT,
//       }),
//     );
//   });

//   test('Single Node ReplicationGroups throw if any other node count is specified', () => {
//     expect(() => {
//       new ReplicationGroup(stack, 'ReplicationGroup', {
//         masterUser: {
//           masterUsername: 'admin',
//         },
//         vpc,
//         ReplicationGroupType: ReplicationGroupType.SINGLE_NODE,
//         numberOfNodes: 2,
//       });
//     }).toThrow(/Number of nodes must be not be supplied or be 1 for ReplicationGroup type single-node/);
//   });

//   test('Multi-Node ReplicationGroups default to 2 nodes', () => {
//     // WHEN
//     new ReplicationGroup(stack, 'ReplicationGroup', {
//       masterUser: {
//         masterUsername: 'admin',
//       },
//       vpc,
//       ReplicationGroupType: ReplicationGroupType.MULTI_NODE,
//     });

//     // THEN
//     cdkExpect(stack).to(
//       haveResource('AWS::ReplicationGroup::ReplicationGroup', {
//         ReplicationGroupType: 'multi-node',
//         NumberOfNodes: 2,
//       }),
//     );
//   });

//   test.each([0, 1, -1, 101])('Multi-Node ReplicationGroups throw with %s nodes', (numberOfNodes: number) => {
//     expect(() => {
//       new ReplicationGroup(stack, 'ReplicationGroup', {
//         masterUser: {
//           masterUsername: 'admin',
//         },
//         vpc,
//         ReplicationGroupType: ReplicationGroupType.MULTI_NODE,
//         numberOfNodes,
//       });
//     }).toThrow(/Number of nodes for ReplicationGroup type multi-node must be at least 2 and no more than 100/);
//   });

//   test('Multi-Node ReplicationGroups should allow input parameter for number of nodes', () => {
//     // WHEN
//     const numberOfNodesParam = new cdk.CfnParameter(stack, 'numberOfNodes', {
//       type: 'Number',
//     });

//     new ReplicationGroup(stack, 'ReplicationGroup', {
//       masterUser: {
//         masterUsername: 'admin',
//       },
//       vpc,
//       ReplicationGroupType: ReplicationGroupType.MULTI_NODE,
//       numberOfNodes: numberOfNodesParam.valueAsNumber,
//     });

//     // THEN
//     cdkExpect(stack).to(
//       haveResource('AWS::ReplicationGroup::ReplicationGroup', {
//         ReplicationGroupType: 'multi-node',
//         NumberOfNodes: {
//           Ref: 'numberOfNodes',
//         },
//       }),
//     );
//   });
//});

test('create an encrypted ReplicationGroup with custom KMS key', () => {
  // WHEN
  new ReplicationGroup(stack, 'ReplicationGroup', {
    encryptionKey: new kms.Key(stack, 'Key'),
    vpc,
  });

  // THEN
  cdkExpect(stack).to(
    haveResource('AWS::ElastiCache::ReplicationGroup', {
      KmsKeyId: {
        'Fn::GetAtt': ['Key961B73FD', 'Arn'],
      },
    }),
  );
});

test('ReplicationGroup with parameter group', () => {
  // WHEN
  const group = new ParameterGroup(stack, 'Params', {
    description: 'bye',
    cacheParameterGroupFamily: CacheParameterGroupFamily.REDIS_6_X,
    properties: {
      param: 'value',
    },
  });

  new ReplicationGroup(stack, 'ReplicationGroup', {
    parameterGroup: group,
    vpc,
  });

  // THEN
  cdkExpect(stack).to(
    haveResource('AWS::ElastiCache::ReplicationGroup', {
      CacheParameterGroupName: { Ref: 'ParamsA8366201' },
    }),
  );
});

test('publicly accessible ReplicationGroup', () => {
  // WHEN
  new ReplicationGroup(stack, 'ReplicationGroup', {
    publiclyAccessible: true,
    vpc,
  });

  // THEN
  // cdkExpect(stack).to(
  //   haveResource('AWS::ReplicationGroup::ReplicationGroup', {
  //     PubliclyAccessible: true,
  //   }),
  // );
});

test('imported ReplicationGroup with imported security group honors allowAllOutbound', () => {
  // GIVEN
  const replicationGroup = ReplicationGroup.fromReplicationGroupAttributes(stack, 'rg', {
    primaryEndpointAddress: 'addr',
    primaryEndpointPort: 1234,
    readerEndpointAddress: 'readr',
    readerEndpointPort: 4321,
    replicationGroupId: 'identifier',
    securityGroups: [
      ec2.SecurityGroup.fromSecurityGroupId(stack, 'SG', 'sg-123456789', {
        allowAllOutbound: false,
      }),
    ],
  });

  // WHEN
  replicationGroup.connections.allowToAnyIpv4(ec2.Port.tcp(443));

  // THEN
  cdkExpect(stack).to(
    haveResource('AWS::EC2::SecurityGroupEgress', {
      GroupId: 'sg-123456789',
    }),
  );
});

test('throws validation error when trying to set encryptionKey without enabling encryption', () => {
  // GIVEN
  const key = new kms.Key(stack, 'kms-key');

  // WHEN
  const props: ReplicationGroupProps = {
    atRestEncrypted: false,
    encryptionKey: key,
    vpc,
  };

  // THEN
  expect(() => {
    new ReplicationGroup(stack, 'ReplicationGroup', props);
  }).toThrowError();
});

test('can use existing ReplicationGroup subnet group', () => {
  // GIVEN
  new ReplicationGroup(stack, 'ReplicationGroup', {
    vpc,
    subnetGroup: SubnetGroup.fromSubnetGroupName(stack, 'Group', 'my-existing-ReplicationGroup-subnet-group'),
  });

  cdkExpect(stack).notTo(haveResource('AWS::ElastiCache::SubnetGroup'));
  cdkExpect(stack).to(
    haveResourceLike('AWS::ElastiCache::ReplicationGroup', {
      CacheSubnetGroupName: 'my-existing-ReplicationGroup-subnet-group',
    }),
  );
});

test('default child returns a CfnReplicationGroup', () => {
  const replicationGroup = new ReplicationGroup(stack, 'ReplicationGroup', { vpc });

  expect(replicationGroup.node.defaultChild).toBeInstanceOf(CfnReplicationGroup);
});

function testStack() {
  const newTestStack = new cdk.Stack(undefined, undefined, { env: { account: '12345', region: 'us-test-1' } });
  newTestStack.node.setContext('availability-zones:12345:us-test-1', ['us-test-1a', 'us-test-1b']);
  return newTestStack;
}
