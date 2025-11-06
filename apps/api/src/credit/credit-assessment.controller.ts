import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOkResponse,
    ApiProduces,
    ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CreditAssessmentService } from './credit-assessment.service';
import { CreditAssessmentRequestDto } from './dto/credit-assessment.dto';

@ApiTags('Credit')
@ApiBearerAuth()
@Controller('credit')
export class CreditAssessmentController {
    constructor(private readonly svc: CreditAssessmentService) {}

    @Post('assessment/pdf')
    @HttpCode(200)
    @ApiConsumes('application/json')
    @ApiBody({ type: CreditAssessmentRequestDto })
    @ApiProduces('application/pdf')
    @ApiOkResponse({
        description: 'Returns the Experian Credit Assessment report as a PDF.',
        schema: { type: 'string', format: 'binary' },
    })
    async getPdf(@Body() dto: CreditAssessmentRequestDto, @Res() res: Response) {
        const { filename, mime, buf } = await this.svc.getCreditAssessmentPdf(dto);
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        return res.send(buf);
    }
}
