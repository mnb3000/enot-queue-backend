import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class QueuePlaceType {
  @Field()
  queueName!: string;

  @Field()
  place!: number;
}
