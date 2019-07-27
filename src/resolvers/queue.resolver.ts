import {
  Arg, Int, Mutation, PubSub, PubSubEngine, Query, Resolver, Root, Subscription,
} from 'type-graphql';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { Repository } from 'typeorm';
import { findIndex } from 'lodash';
import { Queue, Student, StudentToQueue } from '../entities';
import { QueueInput } from './types/queue.input';
import { SubscriptionTopics } from './types/subscriptionTopics';
import { StatusEnum } from './types/status.enum';
import { publishStudentNotifications, publishQueueFilterUpdate } from '../helpers';
import { QueueUpdateFilterPayload } from './types/queueUpdateFilter.payload';
import { QueueUpdateFilterInput } from './types/queueUpdateFilter.input';

@Resolver(Queue)
export class QueueResolver {
  constructor(
    @InjectRepository(Student) private readonly studentRepository: Repository<Student>,
    @InjectRepository(Queue) private readonly queueRepository: Repository<Queue>,
    @InjectRepository(StudentToQueue)
    private readonly studentToQueueRepository: Repository<StudentToQueue>,
  ) {}

  @Query(() => Queue, { nullable: true })
  queue(@Arg('name') name: string): Promise<Queue | undefined> {
    return this.queueRepository.findOne({ name });
  }

  @Query(() => [Queue])
  queues(): Promise<Queue[]> {
    return this.queueRepository.find();
  }

  @Mutation(() => Queue)
  async addQueue(@Arg('queue') queueInput: QueueInput): Promise<Queue> {
    const queue = this.queueRepository.create(queueInput);
    return this.queueRepository.save(queue);
  }

  @Mutation(() => Queue)
  async removeStudentFromQueue(
    @Arg('queueName') queueName: string,
    @Arg('studentTgId', () => Int) studentTgId: number,
    @PubSub() pubSub: PubSubEngine,
  ): Promise<Queue> {
    const student = await this.studentRepository.findOne({ tgId: studentTgId });
    if (!student) throw new Error('Student not found!');
    const queue = await this.queueRepository.findOne({ name: queueName });
    if (!queue) throw new Error('Queue not found!');
    const studentToQueues = await queue.studentToQueuesInQueue();
    const queueStudents = await queue.students();
    const studentIndex = findIndex(queueStudents, { tgId: studentTgId });
    if (studentIndex === -1) throw new Error('Student not in queue!');
    studentToQueues[studentIndex].status = StatusEnum.passed;
    await this.studentToQueueRepository.save(studentToQueues[studentIndex]);
    await Promise.all([
      pubSub.publish(SubscriptionTopics.queueUpdate, queue),
      publishStudentNotifications(queueStudents, queueName, pubSub),
      publishQueueFilterUpdate(queue, pubSub),
    ]);
    return queue;
  }

  @Mutation(() => Queue)
  async passQueueStudent(
    @Arg('queueName') queueName: string,
    @Arg('isPassed') isPassed: boolean,
    @PubSub() pubSub: PubSubEngine,
  ) {
    const queue = await this.queueRepository.findOne({ name: queueName });
    if (!queue) throw new Error('Queue not found!');
    const studentToQueues = await queue.studentToQueuesInQueue();
    const firstStudentToQueue = studentToQueues[0];
    if (!firstStudentToQueue) throw new Error('Queue is empty!');
    firstStudentToQueue.status = isPassed ? StatusEnum.passed : StatusEnum.declined;
    await this.studentToQueueRepository.save(firstStudentToQueue);
    const queueStudents = await queue.students();
    await Promise.all([
      pubSub.publish(SubscriptionTopics.queueUpdate, queue),
      publishStudentNotifications(queueStudents, queueName, pubSub),
      publishQueueFilterUpdate(queue, pubSub),
    ]);
    return queue;
  }

  @Subscription({
    topics: SubscriptionTopics.queueUpdate,
    filter: ({ payload, args }) => payload.name === args.queueName,
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  queueUpdate(@Root() queueUpdatePayload: Queue, @Arg('queueName') queueName: string): Queue {
    return queueUpdatePayload;
  }

  @Subscription({
    topics: SubscriptionTopics.queueFilterUpdate,
    filter: ({ payload, args }) => payload.queueId === args.filterInput.queueId,
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  queueUpdateFilter(@Root() queueUpdateFilterPayload: QueueUpdateFilterPayload, @Arg('filterInput') filterInput: QueueUpdateFilterInput): QueueUpdateFilterPayload {
    return {
      ...queueUpdateFilterPayload,
      upcomingStudentToQueues: queueUpdateFilterPayload.upcomingStudentToQueues
        .slice(0, filterInput.upcomingLimit),
      historyStudentToQueues: queueUpdateFilterPayload.historyStudentToQueues
        .slice(0, filterInput.historyLimit),
    };
  }
}
