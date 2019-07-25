import { getRepository } from 'typeorm';
import { PubSubEngine } from 'type-graphql';
import { find } from 'lodash';
import { Queue, Student, StudentToQueue } from './entities';
import { SubscriptionTopics } from './resolvers/types/subscriptionTopics';

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
      nextId: 3,
      students: [student1, student2],
    },
    {
      name: '121',
      nextId: 2,
      students: [student2],
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
  queueStudents.forEach(async queueStudent => {
    const queuePlaces = await queueStudent.queuePlaces();
    const payload = {
      ...find(queuePlaces, { queueName }),
      student: queueStudent,
    };
    await pubSub.publish(SubscriptionTopics.studentUpdate, payload);
  });
}
