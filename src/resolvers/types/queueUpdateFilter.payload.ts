import { ObjectType, Field, ID } from 'type-graphql';
import { StudentToQueue } from '../../entities';

@ObjectType()
export class QueueUpdateFilterPayload {
  @Field(() => ID)
  queueId!: string;

  @Field(() => [StudentToQueue])
  upcomingStudentToQueues!: StudentToQueue[];

  @Field(() => [StudentToQueue])
  historyStudentToQueues!: StudentToQueue[];
}
