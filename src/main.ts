import { NestFactory, Reflector } from '@nestjs/core';
import {
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule, ObserveInstrument } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * Bootstraps and initializes the CareConnect NestJS application.
 *
 * Configures the complete application runtime pipeline:
 * 1. **CORS:** Permits cross-origin requests with authorized methods, credentials, and headers.
 * 2. **Security Headers (Helmet):** Enforces secure HTTP headers while allowing cross-origin resources and Swagger UI.
 * 3. **Global Routing Prefix:** Sets `/api/v1` as the base route prefix for all REST controllers.
 * 4. **Global Validation Pipe:** Enforces strict DTO validation with property whitelisting, rejection of unexpected fields (`forbidNonWhitelisted: true`), and implicit type conversion (`enableImplicitConversion: true`).
 * 5. **Global Exception Filter:** Normalizes all HTTP exceptions into uniform JSON envelopes conforming to standard error response schemas.
 * 6. **Global Serialization Interceptor:** Enforces class-transformer rules (e.g. `@Exclude()` on password hashes and internal fields).
 * 7. **OpenAPI / Swagger:** Generates interactive API documentation at `/api/v1/docs` with Bearer JWT authorization and modular grouping.
 * 8. **HTTP Listener:** Binds the application to the configured environment port (default `3000`) across all network interfaces (`0.0.0.0`).
 *
 * @returns Resolves once the server is successfully listening for incoming requests.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

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

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`CareConnect API is running on: http://localhost:${port}`);
  console.log(`Swagger documentation available at: http://localhost:${port}/api/v1/docs`);
}
bootstrap();
