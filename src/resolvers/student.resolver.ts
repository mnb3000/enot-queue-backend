import {
  Arg, Int, Mutation, PubSub, PubSubEngine, Query, Resolver, Root, Subscription,
} from 'type-graphql';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { Repository } from 'typeorm';
import { find } from 'lodash';
import { Queue, Student, StudentToQueue } from '../entities';
import { StudentInput } from './types/student.input';
import { SubscriptionTopics } from './types/subscriptionTopics';
import { StudentUpdatePayload } from './types/studentUpdate.payload';
import { StatusEnum } from './types/status.enum';
import { publishStudentNotifications, publishQueueFilterUpdate } from '../helpers';

@Resolver(Student)
export class StudentResolver {
  constructor(
    @InjectRepository(Student) private readonly studentRepository: Repository<Student>,
    @InjectRepository(Queue) private readonly queueRepository: Repository<Queue>,
    @InjectRepository(StudentToQueue)
    private readonly studentToQueueRepository: Repository<StudentToQueue>,
  ) {}

  @Query(() => Student, { nullable: true })
  student(@Arg('tgId', () => Int) studentTgId: number): Promise<Student | undefined> {
    return this.studentRepository.findOne({ tgId: studentTgId });
  }

  @Query(() => [Student])
  students(): Promise<Student[]> {
    return this.studentRepository.find();
  }

  @Mutation(() => Student)
  async addStudent(@Arg('student') studentInput: StudentInput): Promise<Student> {
    const student = this.studentRepository.create(studentInput);
    return this.studentRepository.save(student);
  }

  @Mutation(() => Student)
  async joinQueue(
    @Arg('queueName') queueName: string,
    @Arg('studentTgId', () => Int) studentTgId: number,
    @PubSub() pubSub: PubSubEngine,
  ): Promise<Student> {
    const student = await this.studentRepository.findOne({ tgId: studentTgId });
    if (!student) throw new Error('Student not found!');
    const queue = await this.queueRepository.findOne({ name: queueName });
    if (!queue) throw new Error('Queue not found!');
    const studentToQueues = await student.studentToQueues;
    const queueStudentToQueues = await queue.studentToQueues;
    const isJoined = find(studentToQueues, { queueId: queue.id, status: StatusEnum.inQueue });
    if (isJoined) {
      throw new Error('Already joined!');
    }
    const studentToQueue = this.studentToQueueRepository.create({
      student,
      queue,
    });
    await this.studentToQueueRepository.save(studentToQueue);
    const updatedStudent = this.studentRepository.findOneOrFail(student.id);
    queue.studentToQueues = [...queueStudentToQueues, studentToQueue];
    await Promise.all([
      pubSub.publish(SubscriptionTopics.queueUpdate, queue),
      publishQueueFilterUpdate(queue, pubSub),
    ]);
    return updatedStudent;
  }

  @Mutation(() => Student)
  async leaveQueue(
    @Arg('queueName') queueName: string,
    @Arg('studentTgId', () => Int) studentTgId: number,
    @PubSub() pubSub: PubSubEngine,
  ) {
    const student = await this.studentRepository.findOne({ tgId: studentTgId });
    if (!student) throw new Error('Student not found!');
    const queue = await this.queueRepository.findOne({ name: queueName });
    if (!queue) throw new Error('Queue not found!');
    const studentToQueues = await student.studentToQueuesInQueue();
    const studentQueues = await Promise.all(studentToQueues.map(
      studentToQueue => studentToQueue.queue,
    ));
    const studentQueueNames = studentQueues.map(studentQueue => studentQueue.name);
    const queueIndex = studentQueueNames.indexOf(queueName);
    if (queueIndex === -1) {
      throw new Error('Student not in queue!');
    }
    studentToQueues[queueIndex].status = StatusEnum.left;
    await this.studentToQueueRepository.save(studentToQueues[queueIndex]);
    const queueStudents = await queue.students();
    await Promise.all([
      pubSub.publish(SubscriptionTopics.queueUpdate, queue),
      publishStudentNotifications(queueStudents, queueName, pubSub),
      publishQueueFilterUpdate(queue, pubSub),
    ]);
    return student;
  }

  @Subscription({
    topics: SubscriptionTopics.studentUpdate,
    filter: ({ payload, args }) => payload.place === args.notifyPlace,
  })
  notifyStudentPlace(
    @Root() studentUpdatePayload: StudentUpdatePayload,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Arg('notifyPlace', () => Int) place: number,
  ): StudentUpdatePayload {
    return studentUpdatePayload;
  }
}
