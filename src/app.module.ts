import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { createObserveModule } from '@nestjs/observe';
import { User } from './users/entities/user.entity';
import { CaregiverProfile } from './caregiver-profiles/entities/caregiver-profile.entity';
import { CaregiverDocument } from './caregiver-profiles/entities/caregiver-document.entity';
import { JobOffer } from './job-offers/entities/job-offer.entity';
import { Application } from './applications/entities/application.entity';
import { ContactRequest } from './contact-requests/entities/contact-request.entity';
import { Review } from './reviews/entities/review.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CaregiversModule } from './caregivers/caregivers.module';
import { JobOffersModule } from './job-offers/job-offers.module';
import { ApplicationsModule } from './applications/applications.module';
import { ContactRequestsModule } from './contact-requests/contact-requests.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module';
import { HistoryModule } from './history/history.module';
import { NotificationListener } from './common/listeners/notification.listener';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const dbSsl = configService.get<string>('DB_SSL');
        const isSsl =
          dbSsl === 'true' ||
          (dbSsl !== 'false' &&
            databaseUrl != null &&
            !databaseUrl.includes('localhost') &&
            !databaseUrl.includes('127.0.0.1'));

        const connectionConfig = databaseUrl
          ? {
              url: databaseUrl,
              ssl: isSsl ? { rejectUnauthorized: false } : false,
            }
          : {
              host: configService.get<string>('DB_HOST', 'localhost'),
              port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
              username: configService.get<string>('DB_USERNAME', 'postgres'),
              password: configService.get<string>('DB_PASSWORD', 'postgres'),
              database: configService.get<string>('DB_DATABASE', 'caregiving_db'),
              ssl: isSsl ? { rejectUnauthorized: false } : false,
            };

        return {
          type: 'postgres' as const,
          ...connectionConfig,
          entities: [
            User,
            CaregiverProfile,
            CaregiverDocument,
            JobOffer,
            Application,
            ContactRequest,
            Review,
          ],
          synchronize:
            configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true' ||
            configService.get<boolean>('DB_SYNCHRONIZE', true) === true,
          logging:
            configService.get<string>('DB_LOGGING', 'false') === 'true' ||
            configService.get<boolean>('DB_LOGGING', false) === true,
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'caregiving-system',
    }),
    UsersModule,
    AuthModule,
    CaregiversModule,
    JobOffersModule,
    ApplicationsModule,
    ContactRequestsModule,
    ReviewsModule,
    AdminModule,
    ReportsModule,
    HistoryModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    NotificationListener,
  ],
})
export class AppModule {}
