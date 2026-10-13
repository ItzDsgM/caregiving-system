// Native dynamic import function that prevents TypeScript from compiling import() to require()
const dynamicImport = new Function('m', 'return import(m)');

let server: any;
let isReady = false;

async function bootstrap() {
  const { NestFactory } = await dynamicImport('@nestjs/core');
  const { ExpressAdapter } = await dynamicImport('@nestjs/platform-express');
  const expressModule = await dynamicImport('express');
  const express = expressModule.default || expressModule;
  const { AppModule, ObserveInstrument } = await dynamicImport('../src/app.module');
  const { configureApp } = await dynamicImport('../src/app.config');

  server = express();

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

export default async function handler(req: any, res: any) {
  if (!isReady) {
    await bootstrap();
  }
  server(req, res);
}
