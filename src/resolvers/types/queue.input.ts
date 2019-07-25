import { Field, InputType } from 'type-graphql';
import { Queue } from '../../entities';

@InputType()
export class QueueInput implements Partial<Queue> {
  @Field()
  name!: string;
}
