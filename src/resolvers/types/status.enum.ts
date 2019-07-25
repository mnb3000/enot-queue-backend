import { registerEnumType } from 'type-graphql';

export enum StatusEnum {
  inQueue = 'IN_QUEUE',
  passed = 'PASSED',
  declined = 'DECLINED',
  left = 'LEFT',
}

registerEnumType(StatusEnum, {
  name: 'Status',
});
