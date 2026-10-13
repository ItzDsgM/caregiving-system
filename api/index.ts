import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import { AppModule, ObserveInstrument } from '../src/app.module';
import { configureApp } from '../src/main';

const server: Express = express();
let isReady = false;

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
    {
      instrument: ObserveInstrument,
    },
  );

  configureApp(app);
  await app.init();
  isReady = true;
}

export default async function handler(req: Request, res: Response) {
  if (!isReady) {
    await bootstrap();
  }
  server(req, res);
}
