import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import AdmZip from 'adm-zip';
import * as soap from 'soap';
import { CreditAssessmentService } from './credit-assessment.service';
import { CreditAssessmentRequestDto } from './dto/credit-assessment.dto';

jest.mock('soap', () => ({
    createClientAsync: jest.fn(),
    WSSecurity: jest.fn(),
}));

describe('CreditAssessmentService', () => {
    const values: Record<string, string> = {
        EXPERIAN_WSDL: 'https://apis-uat.experian.co.za/NormalSearchService?wsdl',
        EXPERIAN_API_URL: 'https://apis-uat.experian.co.za/NormalSearchService',
        EXPERIAN_USERNAME: 'test-user',
        EXPERIAN_PASSWORD: 'test-password',
        EXPERIAN_ORIGIN: 'QAPP',
        EXPERIAN_ORIGIN_VERSION: '1',
        EXPERIAN_ENV: 'uat',
        EXPERIAN_WSSECURITY: 'false',
    };

    const request: CreditAssessmentRequestDto = {
        identityNumber: '8209147250087',
        passportFlag: 'N',
        surname: 'Doe',
        forename: 'John',
        gender: 'M',
        dateOfBirth: '19820914',
        address1: '10 Mars Street',
        address2: 'Mars',
        postalCode: '1234',
        cellTelNo: '27831234567',
        resultType: 'XPDF2',
        clientConsent: true,
        enquiryPurpose: 13,
        includeCpaNlrData: true,
        runCompuScore: true,
        enquirerName: 'QFinance',
        enquirerContact: 'Test Agent',
        enquirerTel: '0123456789',
        clientRef: 'QFTEST123',
    };

    const createService = () => {
        const config = { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
        return new CreditAssessmentService(config);
    };

    const createClient = (result: unknown) => {
        const invoke = jest.fn().mockResolvedValue([result]);
        return {
            describe: jest.fn().mockReturnValue({
                NormalSearchService: {
                    NormalSearchPort: {
                        DoNormalEnquiry: {
                            input: {
                                request: {
                                    pUsrnme: 'string',
                                    pPasswrd: 'string',
                                    pVersion: 'string',
                                    pOrigin: 'string',
                                    pOrigin_Version: 'string',
                                    pInput_Format: 'string',
                                    pTransaction: 'string',
                                },
                            },
                        },
                    },
                },
            }),
            DoNormalEnquiryAsync: invoke,
            setEndpoint: jest.fn(),
            setSecurity: jest.fn(),
        };
    };

    beforeEach(() => jest.clearAllMocks());

    it('makes one enquiry and extracts Experian PDF and XML from retData', async () => {
        const zip = new AdmZip();
        zip.addFile('Enq_8209147250087_123.pdf', Buffer.from('%PDF-1.4\nreport'));
        zip.addFile('Enq_8209147250087_123.xml', Buffer.from('<Report />'));
        const client = createClient({
            DoNormalEnquiryResult: {
                pTransactionCompleted: true,
                retData: zip.toBuffer().toString('base64'),
            },
        });
        (soap.createClientAsync as jest.Mock).mockResolvedValue(client);

        const result = await createService().getCreditAssessmentReport(request);

        expect(client.DoNormalEnquiryAsync).toHaveBeenCalledTimes(1);
        const args = client.DoNormalEnquiryAsync.mock.calls[0][0];
        expect(args.request.pTransaction).toContain('<CPA_Plus_NLR_Data>Y</CPA_Plus_NLR_Data>');
        expect(args.request.pTransaction).toContain('<ResultType>XPDF2</ResultType>');
        expect(args.request.pTransaction).toContain('<ClientConsent>Y</ClientConsent>');
        expect(result.pdf.subarray(0, 5).toString()).toBe('%PDF-');
        expect(result.sourceXml).toBe('<Report />');
    });

    it('does not submit an enquiry without explicit consent', async () => {
        await expect(
            createService().getCreditAssessmentReport({ ...request, clientConsent: false as true })
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(soap.createClientAsync).not.toHaveBeenCalled();
    });

    it('rejects a successful response that is not a ZIP archive', async () => {
        const client = createClient({
            pTransactionCompleted: true,
            retData: Buffer.from('not a zip').toString('base64'),
        });
        (soap.createClientAsync as jest.Mock).mockResolvedValue(client);

        await expect(createService().getCreditAssessmentReport(request)).rejects.toBeInstanceOf(
            BadGatewayException
        );
        expect(client.DoNormalEnquiryAsync).toHaveBeenCalledTimes(1);
    });

    it('does not retry a rejected billable request', async () => {
        const client = createClient({
            pTransactionCompleted: false,
            errorCode: '-139',
            errorString: 'CompuScore requires CPA Plus NLR data',
        });
        (soap.createClientAsync as jest.Mock).mockResolvedValue(client);

        await expect(createService().getCreditAssessmentReport(request)).rejects.toThrow('-139');
        expect(client.DoNormalEnquiryAsync).toHaveBeenCalledTimes(1);
    });

    it('explains that a -103 rejection is an environment credential mismatch', async () => {
        const client = createClient({
            pTransactionCompleted: false,
            errorCode: '-103',
            errorString: 'Username,Password or Subscriber code invalid.',
        });
        (soap.createClientAsync as jest.Mock).mockResolvedValue(client);

        await expect(createService().getCreditAssessmentReport(request)).rejects.toThrow(
            'UAT credentials are not valid'
        );
        expect(client.DoNormalEnquiryAsync).toHaveBeenCalledTimes(1);
    });
});
