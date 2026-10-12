import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { User } from './users/entities/user.entity';
import { CaregiverProfile } from './caregiver-profiles/entities/caregiver-profile.entity';
import { CaregiverDocument } from './caregiver-profiles/entities/caregiver-document.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CaregiversModule } from './caregivers/caregivers.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'caregiving_db'),
        entities: [User, CaregiverProfile, CaregiverDocument],
        synchronize:
          configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true' ||
          configService.get<boolean>('DB_SYNCHRONIZE', true) === true,
        logging:
          configService.get<string>('DB_LOGGING', 'false') === 'true' ||
          configService.get<boolean>('DB_LOGGING', false) === true,
      }),
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
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
