import { ValidationPipe, ClassSerializerInterceptor, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

export function configureApp(app: INestApplication): void {
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Accept,Authorization',
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

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
