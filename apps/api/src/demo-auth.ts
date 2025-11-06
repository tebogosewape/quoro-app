// import { ConfigService } from '@nestjs/config';
// import { AuthService } from './auth/auth.service';
// import { User, UserRole } from './entities/user.entity';
// import { AppDataSource } from './database/data-source';
// import { JwtService } from '@nestjs/jwt';
// import { AuthenticatedUser } from './auth/auth.types';
// import { Repository } from 'typeorm';

// class DemoAuthService extends AuthService {
//     constructor(
//         private readonly demoUserRepository: Repository<User>,
//         jwtService: JwtService,
//         configService: ConfigService
//     ) {
//         super(demoUserRepository, jwtService, configService);
//     }

//     override async validateUser(
//         email: string,
//         password: string
//     ): Promise<AuthenticatedUser | null> {
//         void password;
//         const user = await this.demoUserRepository.findOne({
//             where: { email: email.toLowerCase() },
//         });

//         if (!user) {
//             return null;
//         }

//         return {
//             id: user.id,
//             email: user.email,
//             firstName: user.firstName,
//             lastName: user.lastName,
//             role: user.role,
//             department: user.department,
//         };
//     }
// }

// async function demonstrateAuthSystem() {
//     console.log('🔐 Starting Authentication System Demo...\n');

//     try {
//         // Initialize database
//         await AppDataSource.initialize();
//         console.log('✅ Database connected');

//         const userRepo = AppDataSource.getRepository(User);

//         const configService = new ConfigService({
//             JWT_SECRET: 'demo-secret-key-12345',
//             JWT_ACCESS_EXPIRES_IN: 900,
//             JWT_REFRESH_EXPIRES_IN: 604800,
//         });

//         const jwtService = new JwtService({
//             secret: configService.get<string>('JWT_SECRET', 'demo-secret-key-12345'),
//         });

//         // Initialize AuthService
//         const authService = new DemoAuthService(userRepo, jwtService, configService);

//         // Get existing users from our seeded data
//         const users = await userRepo.find({ take: 3 });
//         if (users.length === 0) {
//             console.log('❌ No users found in database. Please run the seed script first.');
//             return;
//         }

//         console.log(`Found ${users.length} users in database:\n`);
//         users.forEach((user, index) => {
//             console.log(
//                 `${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`
//             );
//         });

//         // Demo 1: Successful login
//         console.log('\n🔑 Demo 1: User Login');
//         console.log('-------------------');
//         const testUser = users.find((u) => u.role === UserRole.AGENT) || users[0];
//         console.log(`Attempting login for: ${testUser!.email}`);

//         try {
//             // For demo, we'll simulate password validation

//             const loginResult = await authService.login({
//                 identifier: testUser!.email,
//                 password: 'demo-password',
//             });

//             console.log('✅ Login successful!');
//             console.log(`Access Token: ${loginResult.access_token.substring(0, 50)}...`);
//             console.log(`User: ${loginResult.user.firstName} ${loginResult.user.lastName}`);
//             console.log(`Role: ${loginResult.user.role}`);
//             console.log(`Expires in: ${loginResult.expires_in} seconds`);

//             // Demo 2: Get user profile
//             console.log('\n👤 Demo 2: Get User Profile');
//             console.log('---------------------------');
//             const profile = await authService.getProfile(loginResult.user.id);
//             console.log('✅ Profile retrieved:');
//             console.log(`Name: ${profile!.firstName} ${profile!.lastName}`);
//             console.log(`Email: ${profile!.email}`);
//             console.log(`Role: ${profile!.role}`);
//             console.log(`Department: ${profile!.department || 'Not assigned'}`);

//             // Demo 3: Refresh token
//             console.log('\n🔄 Demo 3: Refresh Token');
//             console.log('------------------------');
//             const refreshResult = await authService.refreshToken(loginResult.refresh_token);
//             console.log('✅ Token refreshed successfully!');
//             console.log(`New Access Token: ${refreshResult.access_token.substring(0, 50)}...`);
//             console.log(`Expires in: ${refreshResult.expires_in} seconds`);

//             // Demo 4: Logout
//             console.log('\n🚪 Demo 4: User Logout');
//             console.log('---------------------');
//             await authService.logout(loginResult.user.id);
//             console.log('✅ User logged out successfully');

//             // Verify logout by checking refresh token
//             const userAfterLogout = await userRepo.findOne({ where: { id: loginResult.user.id } });
//             console.log(`Refresh token cleared: ${!userAfterLogout!.refreshTokenHash}`);
//         } catch (error) {
//             console.error('❌ Authentication demo failed:', error);
//         }

//         console.log('\n📊 Demo 5: Role-Based Access Control');
//         console.log('------------------------------------');
//         console.log('Available roles in system:');
//         const roleStats = await userRepo
//             .createQueryBuilder('user')
//             .select('user.role, COUNT(*) as count')
//             .groupBy('user.role')
//             .getRawMany<{ user_role: UserRole; count: string }>();

//         roleStats.forEach(({ user_role, count }) => {
//             console.log(`${user_role}: ${Number(count)} users`);
//         });

//         console.log('\n🎉 Authentication System Demo Complete!');
//         console.log('=======================================');
//         console.log('The authentication system provides:');
//         console.log('✅ JWT-based authentication with refresh tokens');
//         console.log('✅ Role-based access control (Admin, Manager, Agent, Viewer)');
//         console.log('✅ Secure password hashing with bcrypt');
//         console.log('✅ Token refresh without re-authentication');
//         console.log('✅ Proper logout with token invalidation');
//         console.log('✅ User profile management');
//         console.log('✅ Account security (failed attempt tracking)');
//     } catch (error) {
//         console.error('❌ Demo failed:', error);
//     } finally {
//         await AppDataSource.destroy();
//         console.log('🔌 Database connection closed');
//     }
// }

// // Only run if this file is executed directly
// if (require.main === module) {
//     demonstrateAuthSystem()
//         .then(() => process.exit(0))
//         .catch((error) => {
//             console.error('Demo error:', error);
//             process.exit(1);
//         });
// }

// export { demonstrateAuthSystem };
