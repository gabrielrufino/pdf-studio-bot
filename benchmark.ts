import { eventRecorderMiddleware } from './src/middlewares/event-recorder.middleware';
import { eventRepository } from './src/repositories';

// Mock the repository
eventRepository.insertMany = async () => [];

async function runBenchmark() {
  const ctxCommand: any = {
    from: { id: 123 },
    message: { text: '/split some args' },
  };

  const ctxButton: any = {
    from: { id: 123 },
    callbackQuery: { data: 'split' },
  };

  const next = async () => {};

  const iterations = 1000000;

  const start = process.hrtime.bigint();

  for (let i = 0; i < iterations; i++) {
    await eventRecorderMiddleware(ctxCommand, next);
    await eventRecorderMiddleware(ctxButton, next);
  }

  const end = process.hrtime.bigint();

  const timeMs = Number(end - start) / 1000000;
  console.log(`Time taken for ${iterations} iterations: ${timeMs.toFixed(2)} ms`);
}

runBenchmark().catch(console.error);
