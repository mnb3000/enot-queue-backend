import { Field, Int, ObjectType } from 'type-graphql';

@ObjectType()
export class QueuePlaceType {
  @Field()
  queueName!: string;

  @Field(() => Int)
  place!: number;

  @Field(() => Int)
  uniqueId!: number;
}
