import {
  Column, CreateDateColumn,
  Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import {
  Field, ID, Int, ObjectType,
} from 'type-graphql';
import { Student } from './Student';
import { Queue } from './Queue';
import { Lazy } from '../helpers';
import { StatusEnum } from '../resolvers/types/status.enum';

@Entity()
@ObjectType()
export class StudentToQueue {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  studentToQueueId!: number;

  @Field(() => ID)
  @Column()
  studentId!: string;

  @Field(() => ID)
  @Column()
  queueId!: string;

  @Field(() => StatusEnum)
  @Column({ type: 'text', default: StatusEnum.inQueue })
  status!: StatusEnum;

  @Field()
  @CreateDateColumn()
  createdAt!: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt!: Date;

  @Field(() => Student)
  @ManyToOne(() => Student, student => student.studentToQueues, { lazy: true })
  student!: Lazy<Student>;

  @Field(() => Queue)
  @ManyToOne(() => Queue, queue => queue.studentToQueues, { lazy: true })
  queue!: Lazy<Queue>;
}
