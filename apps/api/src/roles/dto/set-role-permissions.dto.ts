import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class SetRolePermissionsDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    permissions!: string[];
}
