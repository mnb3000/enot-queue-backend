import { Field, InputType, Int } from 'type-graphql';
import { Student } from '../../entities';

@InputType()
export class StudentInput implements Partial<Student> {
  @Field()
  name!: string;

  @Field(() => Int)
  tgId!: number;
}
