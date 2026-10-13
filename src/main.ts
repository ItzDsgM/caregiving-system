import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';
import { AppModule, ObserveInstrument } from './app.module';
import { configureApp } from './app.config';

let cachedServer: Express;

async function bootstrapServer(): Promise<Express> {
  if (!cachedServer) {
    const expressApp: Express = express();
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      {
        instrument: ObserveInstrument,
      },
    );

    configureApp(app);
    await app.init();
    cachedServer = expressApp;
  }
  return cachedServer;
}

// When running locally outside Vercel, start the HTTP server
if (!process.env.VERCEL) {
  bootstrapServer().then((server) => {
    const port = Number(process.env.PORT ?? 3000);
    server.listen(port, '0.0.0.0', () => {
      console.log(`CareConnect API is running on: http://localhost:${port}`);
    });
  });
}

// Serverless handler for Vercel Functions
export default async function handler(req: any, res: any) {
  const server = await bootstrapServer();
  server(req, res);
}
