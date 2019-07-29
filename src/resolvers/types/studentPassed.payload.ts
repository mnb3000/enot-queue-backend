import { Field, ObjectType } from 'type-graphql';
import { StudentPlaceUpdatePayload } from './studentPlaceUpdate.payload';

@ObjectType()
export class StudentPassedPayload extends StudentPlaceUpdatePayload {
  @Field()
  passed!: boolean;
}
