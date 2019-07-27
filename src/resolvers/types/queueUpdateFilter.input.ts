import { InputType, Field, Int } from 'type-graphql';
import { Min, Max } from 'class-validator';

@InputType()
export class QueueUpdateFilterInput {
  @Field()
  queueId!: string;

  @Field(() => Int)
  @Min(1)
  @Max(10)
  upcomingLimit!: number;

  @Field(() => Int)
  @Min(0)
  @Max(10)
  historyLimit!: number;
}
