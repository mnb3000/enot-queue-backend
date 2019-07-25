import {
  Field, ID, Int, ObjectType,
} from 'type-graphql';
import {
  Column, Entity, OneToMany, PrimaryGeneratedColumn,
} from 'typeorm';
import { findIndex } from 'lodash';
import { Queue } from './Queue';
import { Lazy } from '../helpers';
import { QueuePlaceType } from '../resolvers/types/queuePlace.type';
import { StudentToQueue } from './StudentToQueue';
import { StatusEnum } from '../resolvers/types/status.enum';

@Entity()
@ObjectType()
export class Student {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  readonly id!: string;

  @Field(() => Int)
  @Column('int', { unique: true })
  tgId!: number;

  @Field()
  @Column()
  name!: string;

  // @Field(() => [Queue])
  // @ManyToMany(() => Queue, queue => queue.students, { lazy: true })
  // @JoinTable()
  // queues!: Lazy<Queue[]>;

  @Field(() => [StudentToQueue])
  @OneToMany(() => StudentToQueue, studentToQueue => studentToQueue.student, { lazy: true, cascade: ['insert'] })
  studentToQueues!: Lazy<StudentToQueue[]>;

  @Field(() => [StudentToQueue])
  async studentToQueuesInQueue(): Promise<StudentToQueue[]> {
    return (await this.studentToQueues).filter(
      studentToQueue => studentToQueue.status === StatusEnum.inQueue,
    );
  }

  @Field(() => [Queue])
  async queues(): Promise<Queue[]> {
    const studentToQueues = await this.studentToQueues;
    return Promise.all(studentToQueues
      .filter(studentToQueue => studentToQueue.status === StatusEnum.inQueue)
      .map(studentToQueue => studentToQueue.queue));
  }

  @Field(() => [QueuePlaceType])
  async queuePlaces(): Promise<QueuePlaceType[]> {
    const queues = await this.queues();
    return Promise.all(queues.map(async queue => {
      const queueStudents = await queue.students();
      console.log(queueStudents);
      return {
        queueName: queue.name,
        place: findIndex(queueStudents, { id: this.id }) + 1,
      };
    }));
  }
}
