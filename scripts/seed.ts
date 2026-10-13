import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AdminSeedService } from '../src/admin/admin-seed.service';

/**
 * Standalone database seeding script.
 * Can be executed via CLI: `bun run seed`.
 */
async function runSeed() {
  console.log('--- Initializing CareConnect Seed Runner ---');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const seedService = app.get(AdminSeedService);
    const result = await seedService.seedDatabase();
    console.log('Seeding finished successfully:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Seeding encountered an error:', error);
    process.exit(1);
  } finally {
    await app.close();
    console.log('--- Database seeding context closed ---');
  }
}

runSeed();
