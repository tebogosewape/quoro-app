import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Permission } from '../../entities/permissions.entity';
import { RolePermission } from '../../entities/role-permission.entity';
import { Role } from '@/entities/roles.entity';

// Load env explicitly (works inside/outside Docker)
const NODE_ENV = process.env.NODE_ENV || 'development';
const envPath = path.resolve(__dirname, `../../.env.${NODE_ENV}`);
dotenv.config({ path: envPath });
console.log(`[seed-rbac] NODE_ENV=${NODE_ENV} -> ${envPath}`);

const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'mysql-dev',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'quora-app',
    entities: [Role, Permission, RolePermission],
    synchronize: false,
    logging: ['error'],
});

// Master permission list
const PERMS = [
    'leads.upload',
    'clients.create',
    'sales.verify',
    'debicheck.send',
    'sales.commit',
    'sales.edit',
    'sales.cancel',
    'payments.cancel',
    'reports.sales.view',
    'reports.commission.view',
    'roles.manage',
];

// Role definitions (includes agent + manager)
const ROLES: Array<{ slug: string; name: string; perms: string[]; desc?: string }> = [
    {
        slug: 'agent',
        name: 'Agent',
        perms: ['clients.create', 'sales.verify', 'reports.sales.view', 'reports.commission.view'],
    },
    {
        slug: 'sales_agent',
        name: 'Sales Agent',
        perms: ['clients.create', 'sales.verify', 'reports.sales.view', 'reports.commission.view'],
    },
    { slug: 'manager', name: 'Manager', perms: PERMS },
    { slug: 'team_leader', name: 'Team Leader', perms: PERMS },
    { slug: 'admin', name: 'Admin', perms: PERMS },
    { slug: 'admin_manager', name: 'Admin Manager', perms: PERMS },
    { slug: 'operations_manager', name: 'Operations Manager', perms: PERMS },
    { slug: 'chief_executive_officer', name: 'Chief Executive Officer', perms: PERMS },
    {
        slug: 'lead_provider',
        name: 'Lead Provider',
        perms: ['leads.upload', 'reports.sales.view', 'reports.commission.view'],
    },
    {
        slug: 'debt_review_specialist',
        name: 'Debt Review',
        perms: ['clients.create', 'sales.verify', 'sales.edit'],
    },
    { slug: 'viewer', name: 'Viewer', perms: ['reports.sales.view', 'reports.commission.view'] },
];

import { SelectQueryBuilder } from 'typeorm';

async function upsertPermissions(qb: SelectQueryBuilder<import('typeorm').ObjectLiteral>) {
    console.log(`[seed-rbac] upserting ${PERMS.length} permissions…`);
    // Use INSERT ... ON DUPLICATE KEY UPDATE for reliability
    for (const key of PERMS) {
        await qb
            .insert()
            .into(Permission)
            .values({ key, description: key })
            .orUpdate(['description'], ['key'])
            .execute();
    }

    const rows = await qb.select('p').from(Permission, 'p').getMany();
    const map = new Map(rows.map((p) => [p.key, p]));
    if (map.size < PERMS.length) {
        throw new Error(
            `[seed-rbac] permissions missing after upsert. Have=${map.size}, Want=${PERMS.length}`
        );
    }
    return map;
}

interface UpsertRole {
    slug: string;
    name: string;
    desc?: string;
}

interface RoleEntity {
    id: string;
    slug: string;
    name: string;
    description: string;
}

async function upsertRoles(
    qb: import('typeorm').SelectQueryBuilder<import('typeorm').ObjectLiteral>
): Promise<Map<string, RoleEntity>> {
    console.log(`[seed-rbac] upserting ${ROLES.length} roles…`);
    for (const r of ROLES as UpsertRole[]) {
        await qb
            .insert()
            .into(Role)
            .values({ slug: r.slug, name: r.name, description: r.desc ?? r.slug })
            .orUpdate(['name', 'description'], ['slug'])
            .execute();
    }

    const rows = await qb.select('r').from(Role, 'r').getMany();
    const roleEntities: RoleEntity[] = rows.map((r: Role) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description ?? '',
    }));
    const map = new Map(roleEntities.map((r) => [r.slug, r]));
    if (map.size < ROLES.length) {
        // not fatal if DB already has extra roles; we just ensure ours exist
        console.warn(`[seed-rbac] roles present=${map.size} (>= our set)`);
    }
    return map;
}

type RoleMap = Map<string, RoleEntity>;
type PermMap = Map<string, Permission>;

async function relinkRolePermissions(
    qb: import('typeorm').SelectQueryBuilder<import('typeorm').ObjectLiteral>,
    roleMap: RoleMap,
    permMap: PermMap
): Promise<void> {
    console.log(`[seed-rbac] rebuilding role_permissions…`);
    for (const r of ROLES) {
        const role = roleMap.get(r.slug);
        if (!role) {
            console.warn(`[seed-rbac] skip role ${r.slug} (not found after upsert)`);
            continue;
        }
        await qb.delete().from(RolePermission).where({ roleId: role.id }).execute();

        const values: Array<{ roleId: string; permissionId: string }> = r.perms.map((k) => {
            const p = permMap.get(k);
            if (!p) throw new Error(`[seed-rbac] permission '${k}' missing for role '${r.slug}'`);
            return { roleId: role.id, permissionId: p.id };
        });

        if (values.length) {
            await qb.insert().into(RolePermission).values(values).execute();
        }
        console.log(`[seed-rbac] ${r.slug}: linked ${values.length} permissions`);
    }
}

async function run() {
    await ds.initialize();
    // Type guard or cast to access username safely
    const opts =
        ds.options as import('typeorm/driver/mysql/MysqlConnectionOptions').MysqlConnectionOptions;
    console.log('[seed-rbac] connected', {
        host: opts.host,
        db: opts.database,
        user: opts.username,
    });

    await ds.transaction(async (manager) => {
        const qb = manager.createQueryBuilder();

        const permMap = await upsertPermissions(qb);
        const roleMap = await upsertRoles(qb);
        await relinkRolePermissions(qb, roleMap, permMap);
    });

    console.log('[seed-rbac] done ✅');
    await ds.destroy();
}

run().catch(async (err) => {
    console.error('[seed-rbac] FAILED ❌', err);
    try {
        await ds.destroy();
    } catch {
        // intentionally ignored
    }
    process.exit(1);
});
