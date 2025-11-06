/* eslint-disable indent */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, Length, Matches } from 'class-validator';

export class CreditAssessmentRequestDto {
    @ApiProperty({
        example: '8209147250087',
        description: 'SA ID number',
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{13}$/)
    identityNumber!: string;

    @ApiPropertyOptional({
        example: 'N',
        description: 'Set to Y if identityNumber is a Passport Number, N for SA ID. Defaults to N.',
    })
    @IsString()
    @IsOptional()
    @IsIn(['Y', 'N'])
    passportFlag?: 'Y' | 'N';

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @IsNotEmpty()
    @Length(1, 35) // Max length 35 per doc
    surname!: string;

    @ApiProperty({ example: 'John' })
    @IsString()
    @IsNotEmpty()
    @Length(1, 35) // Max length 35 per doc
    forename!: string;

    @ApiPropertyOptional({
        example: 'M',
        description: 'Gender: M = Male, F = Female. Defaults to M.',
    })
    @IsString()
    @IsOptional()
    @IsIn(['M', 'F'])
    gender?: 'M' | 'F';

    @ApiProperty({ example: '19820914', description: 'YYYYMMDD (must be < current year)' })
    @IsString()
    @Matches(/^\d{8}$/)
    dateOfBirth!: string;

    @ApiProperty({ example: '10 Mars Street' })
    @IsString()
    @IsNotEmpty()
    @Length(1, 40) // Updated length to 40 per doc
    address1!: string;

    @ApiProperty({ example: 'Mars' })
    @IsString()
    @IsNotEmpty()
    @Length(1, 25)
    address2!: string;

    @ApiPropertyOptional({ example: 'Mars' })
    @IsString()
    @IsOptional()
    @Length(1, 25) // Max length 25 per doc
    address3?: string;

    @ApiPropertyOptional({ example: 'Mars' })
    @IsString()
    @IsOptional()
    @Length(1, 25) // Max length 25 per doc
    address4?: string;

    @ApiProperty({ example: '0152', description: '5 digits postal code' })
    @IsString()
    @IsOptional()
    @Matches(/^\d{5}$/) // 5 digits per doc
    postalCode?: string;

    @ApiPropertyOptional({ example: '27', description: 'Home Tel Code. Max 7 digits.' })
    @IsString()
    @IsOptional()
    @Length(1, 7)
    @Matches(/^\d+$/)
    homeTelCode?: string;

    @ApiPropertyOptional({ example: '123456789', description: 'Home Tel No. Max 13 digits.' })
    @IsString()
    @IsOptional()
    @Length(1, 13)
    @Matches(/^\d+$/)
    homeTelNo?: string;

    @ApiPropertyOptional({ example: '27', description: 'Work Tel Code. Max 7 digits.' })
    @IsString()
    @IsOptional()
    @Length(1, 7)
    @Matches(/^\d+$/)
    workTelCode?: string;

    @ApiPropertyOptional({ example: '123456789', description: 'Work Tel No. Max 13 digits.' })
    @IsString()
    @IsOptional()
    @Length(1, 13)
    @Matches(/^\d+$/)
    workTelNo?: string;

    @ApiPropertyOptional({ example: '27831234567', description: 'Cell Tel No. Max 16 digits.' })
    @IsString()
    @IsOptional()
    @Length(1, 16)
    @Matches(/^\d+$/)
    cellTelNo?: string;

    @ApiPropertyOptional({
        example: 'PDF4',
        enum: ['PDF2', 'PDF3', 'PDF4', 'XPDF2', 'XPDF3', 'XPDF4', 'JPDF2', 'JPDF3', 'JPDF4'],
    })
    @IsOptional()
    @IsIn([
        'XML',
        'JSON',
        'PDF2',
        'PDF3',
        'PDF4',
        'XPDF2',
        'XPDF3',
        'XPDF4',
        'JPDF2',
        'JPDF3',
        'JPDF4',
    ]) // Added all ResultType options
    resultType?:
        | 'XML'
        | 'JSON'
        | 'PDF2'
        | 'PDF3'
        | 'PDF4'
        | 'XPDF2'
        | 'XPDF3'
        | 'XPDF4'
        | 'JPDF2'
        | 'JPDF3'
        | 'JPDF4';

    // Enquirer (required by spec)
    @ApiProperty({ example: 'Quora Holdings (QA Branch)' })
    @IsString()
    @IsNotEmpty()
    @Length(1, 50) // Max 50 chars for EnquirerName
    enquirerName!: string;

    @ApiProperty({ example: 'MrTest' })
    @IsString()
    @IsNotEmpty()
    @Length(1, 35) // Max 35 chars for EnquirerContact
    enquirerContact!: string;

    @ApiProperty({ example: '(021) 123 4567' })
    @IsString()
    @IsNotEmpty()
    @Length(1, 20) // Max 20 chars for EnquirerTel
    enquirerTel!: string;

    @ApiPropertyOptional({ example: 'CLIENT-REF-12345', description: 'Max 20 chars' })
    @IsOptional()
    @IsString()
    @Length(1, 20)
    clientRef?: string;

    @ApiPropertyOptional({ example: 'CLIENT-REF-12345', description: 'Max 20 chars' })
    @IsOptional()
    @IsString()
    @Length(1, 20)
    forename2?: string;

    @ApiPropertyOptional({ example: 'CLIENT-REF-12345', description: 'Max 20 chars' })
    @IsOptional()
    @IsString()
    @Length(1, 20)
    forename3?: string;
}
