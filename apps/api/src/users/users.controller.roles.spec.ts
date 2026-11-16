import { ROLES_KEY } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { UsersController } from './users.controller';

describe('UsersController profile role access', () => {
    const allRoles = Object.values(UserRole);

    it.each(['getUserById', 'updateUser', 'changePassword'] as const)(
        'allows every authenticated role to call %s while ownership checks remain in the handler',
        (method) => {
            const roles = Reflect.getMetadata(
                ROLES_KEY,
                UsersController.prototype[method]
            ) as UserRole[];

            expect(roles).toEqual(expect.arrayContaining(allRoles));
            expect(new Set(roles).size).toBe(allRoles.length);
        }
    );
});
