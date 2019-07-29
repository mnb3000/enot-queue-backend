import { find } from 'lodash';
import { PubSubEngine } from 'type-graphql';
import { getRepository } from 'typeorm';
import { Queue, Student, StudentToQueue } from './entities';
import { StatusEnum } from './resolvers/types/status.enum';
import { SubscriptionTopics } from './resolvers/types/subscriptionTopics';
import { QueueUpdateFilterPayload } from './resolvers/types/queueUpdateFilter.payload';
import { QueuePlaceType } from './resolvers/types/queuePlace.type';

export async function seedDatabase() {
  const studentRepository = getRepository(Student);
  const queueRepository = getRepository(Queue);
  const studentToQueueRepository = getRepository(StudentToQueue);

  const [student1, student2, student3] = studentRepository.create([
    {
      name: 'Test1',
      tgId: 1,
    },
    {
      name: 'Test2',
      tgId: 2,
    },
    {
      name: 'Test3',
      tgId: 3,
    },
  ]);

  await studentRepository.save([student1, student2, student3]);
  const [queue1, queue2] = queueRepository.create([
    {
      name: '126',
    },
    {
      name: '121',
    },
  ]);

  await queueRepository.save([queue1, queue2]);
  const studentToQueues = studentToQueueRepository.create([
    {
      student: student1,
      queue: queue1,
    },
    {
      student: student2,
      queue: queue1,
    },
    {
      student: student2,
      queue: queue2,
    },
  ]);
  await studentToQueueRepository.save(studentToQueues);
}

export type Lazy<T extends object> = Promise<T> | T;

export async function publishStudentNotifications(
  queueStudents: Student[],
  queueName: string,
  pubSub: PubSubEngine,
) {
  const allQueuePlaces: QueuePlaceType[][] = await Promise.all(queueStudents.map(
    queueStudent => queueStudent.queuePlaces(),
  ));
  const payloads = queueStudents.map(
    (queueStudent, i) => ({
      ...find(allQueuePlaces[i], { queueName }),
      student: queueStudent,
    }),
  );
  await Promise.all(payloads.map(
    payload => pubSub.publish(SubscriptionTopics.studentUpdate, payload),
  ));
}

export async function generateQueueFilterPayload(queueId: string):
Promise<QueueUpdateFilterPayload> {
  const studentToQueueRepository = getRepository(StudentToQueue);
  const builder = studentToQueueRepository
    .createQueryBuilder('studentToQueue')
    .leftJoinAndSelect('studentToQueue.queue', 'queue', 'queue.id = :queueId', { queueId });
  const upcomingStudentToQueues = await builder
    .where('studentToQueue.queueId = :queueId', { queueId })
    .andWhere('studentToQueue.status = :status', { status: StatusEnum.inQueue })
    .orderBy('studentToQueue.createdAt', 'ASC')
    .take(10)
    .getMany();
  const historyStudentToQueues = await builder
    .where('studentToQueue.queueId = :queueId', { queueId })
    .andWhere('studentToQueue.status != :status', { status: StatusEnum.inQueue })
    .orderBy('studentToQueue.updatedAt', 'DESC')
    .take(10)
    .getMany();
  return {
    queueId,
    upcomingStudentToQueues,
    historyStudentToQueues,
  };
}

export async function publishQueueFilterUpdate(queue: Queue, pubSub: PubSubEngine) {
  const payload = await generateQueueFilterPayload(queue.id);
  await pubSub.publish(SubscriptionTopics.queueFilterUpdate, payload);
}
