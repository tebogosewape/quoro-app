import {
    IsString,
    IsEmail,
    IsEnum,
    IsOptional,
    IsNumber,
    IsArray,
    IsDateString,
    Length,
    Min,
    Max,
    Matches,
    IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClientStatus, MaritalStatus, ClientType } from '@/entities/client.entity';

export class CreateClientDto {
    // Personal Information
    @IsString()
    @Length(13, 13, { message: 'ID number must be exactly 13 digits' })
    @Matches(/^\d{13}$/, { message: 'ID number must contain only digits' })
    idNumber!: string;

    @IsString()
    @Length(2, 100)
    firstName!: string;

    @IsString()
    @Length(2, 100)
    lastName!: string;

    @IsEmail()
    email!: string;

    @IsString()
    @Matches(/^(\+27|0)[1-8]\d{8}$/, {
        message: 'Invalid South African phone number format',
    })
    phoneNumber!: string;

    @IsOptional()
    @IsString()
    @Matches(/^(\+27|0)[1-8]\d{8}$/, {
        message: 'Invalid South African phone number format',
    })
    alternatePhone?: string;

    @IsDateString()
    dateOfBirth!: string;

    // Status Information
    @IsEnum(MaritalStatus)
    maritalStatus!: MaritalStatus;

    @IsOptional()
    @IsEnum(ClientType)
    clientType?: ClientType;

    @IsOptional()
    @IsEnum(ClientStatus)
    status?: ClientStatus;

    // Address Information
    @IsString()
    @Length(1, 500)
    physicalAddress!: string;

    @IsOptional()
    @IsString()
    @Length(1, 500)
    postalAddress?: string;

    // Financial Information
    @IsNumber()
    @Min(0)
    @Max(10000000)
    @Type(() => Number)
    monthlyIncome!: number;

    @IsNumber()
    @Min(0)
    @Max(10000000)
    @Type(() => Number)
    monthlyExpenses!: number;

    @IsNumber()
    @Min(0)
    @Max(100000000)
    @Type(() => Number)
    totalDebt!: number;

    @IsOptional()
    @IsNumber()
    @Min(300)
    @Max(850)
    @Type(() => Number)
    creditScore?: number;

    // Employment Information
    @IsOptional()
    @IsString()
    @Length(1, 200)
    employer?: string;

    @IsOptional()
    @IsString()
    @Length(1, 100)
    jobTitle?: string;

    // Banking Information
    @IsOptional()
    @IsString()
    @Length(1, 100)
    bankName?: string;

    @IsOptional()
    @IsString()
    @Length(1, 50)
    accountType?: string;

    @IsOptional()
    @IsString()
    @Length(1, 100)
    accountHolder?: string;

    @IsOptional()
    @IsString()
    @Length(1, 50)
    accountNumber?: string;

    @IsOptional()
    @IsString()
    @Length(1, 20)
    branchCode?: string;

    // Agent Assignment
    @IsOptional()
    @IsString()
    assignedAgentId?: string;

    // Document Management
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    documentsRequired?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    documentsReceived?: string[];

    // Product Information
    @IsOptional()
    @IsArray()
    selectedProducts?: Array<{
        productId: string;
        paymentOptionId: string;
        cirAccounts?: string[];
    }>;

    // Payment Information
    @IsOptional()
    @IsObject()
    paymentInfo?: {
        firstPaymentMonth?: string;
        selectedPaymentOptions?: Record<string, string>;
    };

    // Additional Information
    @IsOptional()
    @IsString()
    @Length(1, 50)
    title?: string;

    @IsOptional()
    @IsString()
    @Length(1, 50)
    language?: string;

    @IsOptional()
    @IsString()
    @Length(1, 10)
    gender?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}
