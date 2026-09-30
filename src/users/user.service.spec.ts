import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Test } from '@nestjs/testing';
import { AuditEvent } from '../audit/audit-event.enum';
import { AuditService } from '../audit/audit.service';
import { Role } from '../common/role.enum';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

describe('UserService', () => {
  let userService: UserService;
  let userRepository: jest.Mocked<UserRepository>;
  let audit: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findPage: jest.fn(),
            incrementFailedLogins: jest.fn(),
            save: jest.fn(),
          },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    userService = moduleRef.get(UserService);
    userRepository = moduleRef.get(UserRepository);
    audit = moduleRef.get(AuditService);
  });

  describe('register', () => {
    it('throws when the email is already taken', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: '1',
        email: 'existing@example.com',
        passwordHash: 'hash',
        role: Role.MEMBER,
        totpSecret: null,
        totpEnabled: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
      });

      await expect(userService.register('existing@example.com', 'password123')).rejects.toThrow(
        ConflictException
      );
    });

    it('stores a bcrypt hash, never the raw password', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.save.mockImplementation(async (user) => user as never);

      await userService.register('new@example.com', 'password123');

      const savedUser = userRepository.save.mock.calls[0][0];
      expect(savedUser.passwordHash).toBeDefined();
      expect(savedUser.passwordHash).not.toBe('password123');
    });
  });

  describe('ensureAdmin', () => {
    it('creates an admin when the email is unknown', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.save.mockImplementation(async (user) => user as never);

      await userService.ensureAdmin('admin@example.com', 'password123');

      const saved = userRepository.save.mock.calls[0][0];
      expect(saved.role).toBe(Role.ADMIN);
      expect(saved.passwordHash).not.toBe('password123');
    });

    it('promotes an existing user without touching the password', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: '1',
        email: 'admin@example.com',
        passwordHash: 'hash',
        role: Role.MEMBER,
        totpSecret: null,
        totpEnabled: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
      });
      userRepository.save.mockImplementation(async (user) => user as never);

      await userService.ensureAdmin('admin@example.com', 'password123');

      expect(userRepository.save).toHaveBeenCalledWith({ id: '1', role: Role.ADMIN });
      expect(audit.record).toHaveBeenCalledWith(AuditEvent.ROLE_CHANGED, {
        userId: '1',
        metadata: { from: Role.MEMBER, to: Role.ADMIN },
      });
    });
  });

  describe('list', () => {
    it('translates page/limit into skip/take', async () => {
      userRepository.findPage.mockResolvedValue([[], 0]);

      await userService.list(3, 20);

      expect(userRepository.findPage).toHaveBeenCalledWith(40, 20);
    });
  });

  describe('validateCredentials', () => {
    const baseUser = {
      id: '1',
      email: 'jane@example.com',
      passwordHash: bcrypt.hashSync('password123', 4),
      role: Role.MEMBER,
      totpSecret: null,
      totpEnabled: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
    };

    it('counts a wrong password as a failed attempt', async () => {
      userRepository.findByEmail.mockResolvedValue(baseUser);
      userRepository.incrementFailedLogins.mockResolvedValue(1);

      await expect(userService.validateCredentials(baseUser.email, 'nope')).resolves.toBeNull();

      expect(userRepository.incrementFailedLogins).toHaveBeenCalledWith('1');
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('locks the account on the fifth consecutive failure', async () => {
      userRepository.findByEmail.mockResolvedValue(baseUser);
      userRepository.incrementFailedLogins.mockResolvedValue(5);

      await userService.validateCredentials(baseUser.email, 'nope');

      const saved = userRepository.save.mock.calls[0][0];
      expect(saved.failedLoginAttempts).toBe(0);
      expect(saved.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
      expect(audit.record).toHaveBeenCalledWith(AuditEvent.ACCOUNT_LOCKED, { userId: '1' });
    });

    it('rejects even the correct password while locked', async () => {
      userRepository.findByEmail.mockResolvedValue({
        ...baseUser,
        lockedUntil: new Date(Date.now() + 60_000),
      });

      await expect(userService.validateCredentials(baseUser.email, 'password123')).resolves.toBeNull();
      expect(userRepository.incrementFailedLogins).not.toHaveBeenCalled();
    });

    it('lets the user back in once the lock has expired', async () => {
      userRepository.findByEmail.mockResolvedValue({
        ...baseUser,
        lockedUntil: new Date(Date.now() - 1000),
      });

      await expect(userService.validateCredentials(baseUser.email, 'password123')).resolves.toMatchObject({
        id: '1',
      });
    });
  });
});
