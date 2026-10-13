import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dtos/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Persists a new User entity, optionally within an ongoing external transaction.
   *
   * @param userData - Partial user entity properties to create.
   * @param queryRunner - Optional TypeORM QueryRunner for transactional consistency.
   * @returns Persisted User entity.
   */
  async create(userData: Partial<User>, queryRunner?: QueryRunner): Promise<User> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(User)
      : this.usersRepository;

    const user = repository.create(userData);
    return repository.save(user);
  }

  /**
   * Finds a user record by email address.
   *
   * @param email - Target user email address.
   * @returns The matching User entity if found, or null otherwise.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  /**
   * Finds a user record by unique identifier, including their associated caregiverProfile.
   *
   * @param id - Unique UUID string of the target user.
   * @returns The found User entity with caregiverProfile loaded.
   * @throws NotFoundException If no user exists with the specified UUID.
   */
  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { caregiverProfile: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" was not found`);
    }

    return user;
  }

  /**
   * Locates a user by active password reset token, explicitly including hidden reset fields.
   *
   * @param token - Secure random reset token string.
   * @returns User entity with reset token and expiration date, or null if not found.
   */
  async findByResetToken(token: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.resetPasswordToken')
      .addSelect('user.resetPasswordExpires')
      .where('user.resetPasswordToken = :token', { token })
      .getOne();
  }

  /**
   * Locates a user by ID, explicitly including the hidden twoFactorSecret field.
   *
   * @param id - Unique UUID string of the target user.
   * @returns User entity with twoFactorSecret populated, or null if not found.
   */
  async findByIdWith2faSecret(id: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.twoFactorSecret')
      .where('user.id = :id', { id })
      .getOne();
  }

  /**
   * Locates a user by email, explicitly including the hidden twoFactorSecret field.
   *
   * @param email - Target user email address.
   * @returns User entity with twoFactorSecret populated, or null if not found.
   */
  async findByEmailWith2faSecret(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.twoFactorSecret')
      .where('user.email = :email', { email })
      .getOne();
  }

  /**
   * Updates personal profile attributes (e.g., names, phone) for an existing user.
   *
   * @param id - Unique UUID string of the user to update.
   * @param updateUserDto - DTO containing updated profile fields.
   * @returns Updated User entity.
   * @throws NotFoundException If the user with the given ID is not found.
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  /**
   * Directly saves or updates an existing User entity instance.
   *
   * @param user - User entity instance to save.
   * @returns Persisted User entity.
   */
  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }
}
