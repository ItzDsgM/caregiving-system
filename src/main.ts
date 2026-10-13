import { NestFactory, Reflector } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import {
  ValidationPipe,
  ClassSerializerInterceptor,
  INestApplication,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import express, { Express } from 'express';
import helmet from 'helmet';
import { AppModule, ObserveInstrument } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

let cachedServer: Express;

export function configureApp(app: INestApplication): void {
  // CORS Configuration
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Accept,Authorization',
  });

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Global API Prefix
  app.setGlobalPrefix('api/v1');

  // Global Validation Pipe (Mandatory whitelist & transforms)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Exception Filter (RFC error envelope format)
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Interceptor (DTO class-transformer serialization)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CareConnect API')
    .setDescription(
      'Enterprise REST API documentation for the Caregiving System platform (CareConnect)',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your Bearer JWT token to access protected endpoints',
      },
      'access-token',
    )
    .addTag('Auth', 'Authentication, user registration, and password recovery')
    .addTag('Users', 'User profile retrieval and management')
    .addTag('Caregivers', 'Caregiver professional profile, documents, and search engine')
    .addTag('Job Offers', 'Caregiving job postings and client demand catalog')
    .addTag('Applications', 'Caregiver job applications and selection process')
    .addTag('Contact Requests', 'Direct client-caregiver inquiry messaging')
    .addTag('Reviews', 'Verified feedback, ratings, and reputation management')
    .addTag('Admin', 'Document auditing, compliance badges, and user suspension')
    .addTag('Reports', 'Client modality breakdown and top-served geographical zone analytics')
    .addTag('History', 'Bidirectional engagement history and work records with privacy protection')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, document, {
    customCss: `
      .swagger-ui .curl-command { display: none !important; }
      .swagger-ui .live-responses-table { margin-top: 10px; }
      .swagger-ui .response-col_description__inner { margin-top: 5px; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      requestSnippetsEnabled: false,
    },
  });
}

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
