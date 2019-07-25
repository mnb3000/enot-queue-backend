import 'reflect-metadata';
import { GraphQLServer } from 'graphql-yoga';
import { buildSchema } from 'type-graphql';
import { createConnection, useContainer } from 'typeorm';
import { Container } from 'typedi';
import { seedDatabase } from './helpers';

useContainer(Container);
async function bootstrap() {
  try {
    await createConnection();
    await seedDatabase();
    const schema = await buildSchema({
      resolvers: [`${__dirname}/resolvers/**/*.resolver.ts`],
      container: Container,
    });
    const server = new GraphQLServer({ schema });
    await server.start();
    console.log('Server is running on http://localhost:4000');
  } catch (e) {
    console.error(e);
  }
}

bootstrap()
  .catch(e => console.error(e));
