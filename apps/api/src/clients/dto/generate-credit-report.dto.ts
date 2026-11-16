/* eslint-disable indent */
import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsIn, IsInt, IsString, Length, Max, Min } from 'class-validator';

export class GenerateCreditReportDto {
    @ApiProperty({
        example: true,
        description: 'Confirms that the client explicitly consented to this credit enquiry',
    })
    @Equals(true)
    consentGiven!: true;

    @ApiProperty({ example: 'electronic', enum: ['electronic', 'written', 'verbal'] })
    @IsIn(['electronic', 'written', 'verbal'])
    consentMethod!: 'electronic' | 'written' | 'verbal';

    @ApiProperty({ example: 13, description: 'Experian enquiry purpose code (1-19)' })
    @IsInt()
    @Min(1)
    @Max(19)
    enquiryPurpose!: number;

    @ApiProperty({ example: 'Debt review assessment' })
    @IsString()
    @Length(3, 255)
    purpose!: string;
}
