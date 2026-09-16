import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '../common/role.enum';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

describe('UserService', () => {
  let userService: UserService;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    userService = moduleRef.get(UserService);
    userRepository = moduleRef.get(UserRepository);
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
});
