import {
  Column, Entity, OneToMany, PrimaryGeneratedColumn,
} from 'typeorm';
import {
  Field, ID, Int, ObjectType,
} from 'type-graphql';
import { Student } from './Student';
import { Lazy } from '../helpers';
import { StudentToQueue } from './StudentToQueue';
import { StatusEnum } from '../resolvers/types/status.enum';

@Entity()
@ObjectType()
export class Queue {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  readonly id!: string;

  @Field()
  @Column({ unique: true })
  name!: string;

  @Field(() => Int)
  @Column({ default: 1 })
  nextId!: number;

  @Field(() => [StudentToQueue])
  @OneToMany(() => StudentToQueue, studentToQueue => studentToQueue.queue, { lazy: true, cascade: ['insert'] })
  studentToQueues!: Lazy<StudentToQueue[]>;

  @Field(() => [StudentToQueue])
  async studentToQueuesInQueue(): Promise<StudentToQueue[]> {
    return (await this.studentToQueues).filter(
      studentToQueue => studentToQueue.status === StatusEnum.inQueue,
    );
  }

  @Field(() => [Student])
  async students(): Promise<Student[]> {
    const studentToQueues = await this.studentToQueues;
    return Promise.all(studentToQueues
      .filter(studentToQueue => studentToQueue.status === StatusEnum.inQueue)
      .map(studentToQueue => studentToQueue.student));
  }
}
