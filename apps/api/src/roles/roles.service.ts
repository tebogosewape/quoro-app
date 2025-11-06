import { Permission } from '@/entities/permissions.entity';
import { RolePermission } from '@/entities/role-permission.entity';
import { Role } from '@/entities/roles.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

@Injectable()
export class RolesService {
    constructor(
        @InjectRepository(Role) private readonly roles: Repository<Role>,
        @InjectRepository(Permission) private readonly perms: Repository<Permission>,
        @InjectRepository(RolePermission) private readonly rolePerms: Repository<RolePermission>
    ) {}

    async list() {
        // minimal fields for the UI
        return this.roles.find({
            select: ['id', 'slug', 'name', 'description'],
            order: { name: 'ASC' },
        });
    }

    async ensureRoleBySlug(slug: string): Promise<Role> {
        const role = await this.roles.findOne({ where: { slug } });
        if (!role) throw new NotFoundException(`Role '${slug}' not found`);
        return role;
    }

    async getPermissions(slug: string): Promise<string[]> {
        const role = await this.ensureRoleBySlug(slug);

        const links = await this.rolePerms.find({
            where: { roleId: role.id },
            relations: ['permission'],
        });

        return links.map((l) => l.permission?.key).filter((k): k is string => Boolean(k));
    }

    /**
     * Replace a role's permissions with the provided set (idempotent).
     */
    async setPermissions(
        slug: string,
        permissionKeys: string[]
    ): Promise<{ permissions: string[] }> {
        const role = await this.ensureRoleBySlug(slug);

        // Normalize and dedupe
        const keys = Array.from(new Set(permissionKeys.map((k) => k.trim()).filter(Boolean)));

        // Validate keys exist; create missing ones if you want “auto-create”
        const existing = await this.perms.find({ where: { key: In(keys) } });
        const existingKeys = new Set(existing.map((p) => p.key));
        const missing = keys.filter((k) => !existingKeys.has(k));

        if (missing.length > 0) {
            // Either throw, or auto-create. Here we auto-create with description = key.
            const created = await this.perms.save(
                missing.map((k) => this.perms.create({ key: k, description: k }))
            );
            created.forEach((p) => existing.push(p));
        }

        // Reset links
        await this.rolePerms.delete({ roleId: role.id });

        const links = existing.map((p) =>
            this.rolePerms.create({ roleId: role.id, permissionId: p.id })
        );
        await this.rolePerms.save(links);

        return { permissions: keys };
    }

    async findByIdOrSlug(idOrSlug: string): Promise<Role | null> {
        // Try by id, then by slug
        const byId = await this.roles.findOne({ where: { id: idOrSlug } });
        if (byId) return byId;
        return this.roles.findOne({ where: { slug: idOrSlug } });
    }

    async getPermissionKeysForRole(idOrSlug: string): Promise<string[]> {
        const role = await this.findByIdOrSlug(idOrSlug);
        if (!role) {
            throw new NotFoundException(`Role '${idOrSlug}' not found`);
        }

        const links = await this.rolePerms.find({
            where: { roleId: role.id },
            relations: ['permission'],
        });

        const keys = new Set<string>();
        for (const link of links) {
            if (link.permission?.key) keys.add(link.permission.key);
        }
        return [...keys];
    }
}
