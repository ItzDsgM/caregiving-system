import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const adminExists = await this.userRepository.findOne({
      where: { role: UserRole.ADMIN },
    });

    if (!adminExists) {
      this.logger.log('Seeding initial administrator user...');
      const hashedPassword = await bcrypt.hash('AdminSecret123!', 10);
      const admin = this.userRepository.create({
        email: 'admin@careconnect.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Admin',
        phone: '+573110000000',
        role: UserRole.ADMIN,
        isActive: true,
      });

      await this.userRepository.save(admin);
      this.logger.log('Administrator admin@careconnect.com seeded successfully.');
    }
  }
}
