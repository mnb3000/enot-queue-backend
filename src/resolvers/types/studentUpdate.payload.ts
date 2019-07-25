import { Field, ObjectType } from 'type-graphql';
import { QueuePlaceType } from './queuePlace.type';
import { Student } from '../../entities';

@ObjectType()
export class StudentUpdatePayload extends QueuePlaceType {
  @Field(() => Student)
  student!: Student;
}
