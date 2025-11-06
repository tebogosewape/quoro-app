/* eslint-disable indent */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Injectable,
    Logger,
    BadRequestException,
    UnauthorizedException,
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CreditAssessmentRequestDto } from './dto/credit-assessment.dto';

type PdfResult = { filename: string; mime: string; buf: Buffer };

@Injectable()
export class CreditAssessmentService {
    private readonly logger = new Logger(CreditAssessmentService.name);

    // Config/autodiscovery
    private endpoint = '';
    private targetNs = '';
    private typeNs = '';
    private soapAction: string | null = null;
    private readonly wsdlUrl?: string;

    private readonly user: string;
    private readonly pass: string;
    private readonly origin: string;
    private readonly originVersion: string;
    private readonly useWsSec: boolean;

    private initDone = false;
    private initPromise: Promise<void> | null = null;

    constructor(private readonly cfg: ConfigService) {
        this.wsdlUrl = this.cfg.get<string>('EXPERIAN_WSDL') ?? undefined;
        this.endpoint = this.cfg.get<string>('EXPERIAN_ENDPOINT') ?? '';
        this.targetNs = this.cfg.get<string>('EXPERIAN_TARGET_NS') ?? '';
        this.typeNs = this.cfg.get<string>('EXPERIAN_TYPE_NS') ?? '';
        this.soapAction = this.cfg.get<string>('EXPERIAN_SOAP_ACTION') ?? null;

        this.user = this.cfg.get<string>('EXPERIAN_USERNAME') ?? '';
        this.pass = this.cfg.get<string>('EXPERIAN_PASSWORD') ?? '';
        this.origin = this.cfg.get<string>('EXPERIAN_ORIGIN') ?? 'QAPP';
        this.originVersion = this.cfg.get<string>('EXPERIAN_ORIGIN_VERSION') ?? '1';
        this.useWsSec = (this.cfg.get('EXPERIAN_WSSECURITY') ?? 'false').toLowerCase() === 'true';

        if (!this.user || !this.pass) {
            throw new UnauthorizedException('Experian credentials missing: USERNAME/PASSWORD');
        }
        if ((!this.endpoint || !this.targetNs || !this.typeNs) && !this.wsdlUrl) {
            throw new UnauthorizedException(
                'Experian config missing: provide ENDPOINT/TARGET_NS/TYPE_NS or WSDL URL'
            );
        }
    }

    // ---------- WSDL autodiscovery ----------
    private async ensureInit(): Promise<void> {
        if (this.initDone) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            if (this.endpoint && this.targetNs && this.typeNs) {
                this.initDone = true;
                return;
            }
            if (!this.wsdlUrl) {
                throw new UnauthorizedException(
                    'Missing EXPERIAN_WSDL and incomplete ENDPOINT/TARGET_NS/TYPE_NS.'
                );
            }

            this.logger.log(`Fetching WSDL for autodiscovery: ${this.wsdlUrl}`);
            const { data: wsdlXml } = await axios.get<string>(this.wsdlUrl, {
                responseType: 'text',
            });

            const defsTargetNs =
                this.matchAttr(wsdlXml, /<wsdl:definitions[^>]*?targetNamespace="([^"]+)"/i) ||
                this.matchAttr(wsdlXml, /<definitions[^>]*?targetNamespace="([^"]+)"/i);

            const addr12 = this.matchAttr(wsdlXml, /<soap12:address[^>]*?location="([^"]+)"/i);
            const addr11 = this.matchAttr(wsdlXml, /<soap:address[^>]*?location="([^"]+)"/i);
            const endpoint = (addr12 || addr11 || '').replace(/\?wsdl.*/i, '');

            // Find schema that defines NormalEnqRequestParams → type namespace
            let typeNs = '';
            const schemaRegex =
                /<xs:schema[\s\S]*?<\/xs:schema>|<xsd:schema[\s\S]*?<\/xsd:schema>|<schema[\s\S]*?<\/schema>/gi;
            const schemas = wsdlXml.match(schemaRegex) || [];
            for (const schemaXml of schemas) {
                if (/NormalEnqRequestParams/.test(schemaXml)) {
                    typeNs =
                        this.matchAttr(schemaXml, /targetNamespace="([^"]+)"/i) ||
                        this.matchAttr(schemaXml, /xmlns="([^"]+)"/i) ||
                        '';
                    if (typeNs) break;
                }
            }
            if (!typeNs && defsTargetNs) typeNs = defsTargetNs;

            // SOAPAction for SOAP 1.1
            const actionMatch =
                wsdlXml.match(/<soap:operation[^>]*soapAction="([^"]*DoNormalEnquiry[^"]*)"/i) ||
                wsdlXml.match(/soapAction="([^"]*DoNormalEnquiry[^"]*)"/i);
            this.soapAction =
                this.soapAction ??
                (actionMatch ? actionMatch[1] : `${defsTargetNs}/DoNormalEnquiry`) ??
                null;

            if (!endpoint || !defsTargetNs || !typeNs) {
                throw new UnauthorizedException('Could not autodiscover Experian WSDL namespaces.');
            }

            if (!this.endpoint) this.endpoint = endpoint;
            if (!this.targetNs) this.targetNs = defsTargetNs;
            if (!this.typeNs) this.typeNs = typeNs;

            this.logger.log(`Autodiscovered:
  ENDPOINT   = ${this.endpoint}
  TARGET_NS  = ${this.targetNs}
  TYPE_NS    = ${this.typeNs}
  SOAPAction = ${this.soapAction}`);

            this.initDone = true;
        })();

        return this.initPromise;
    }

    private matchAttr(xml: string, re: RegExp): string | null {
        const m = xml.match(re);
        return m && typeof m[1] === 'string' ? m[1] : null;
    }

    // ---------- Enquiry XML (goes into pTransaction CDATA) ----------
    private txXml(dto: CreditAssessmentRequestDto): string {
        // Per docs: pTransaction holds the Enquiry block, submitted via CDATA. :contentReference[oaicite:3]{index=3}
        const resultType = dto.resultType ?? 'PDF4'; // Valid values include PDF4. :contentReference[oaicite:4]{index=4}
        const postal = dto.postalCode ?? '00000';
        const gender = dto.gender ?? 'M';
        const passportFlag = dto.passportFlag ?? 'N';

        const CS_Data = 'Y';
        const CPA_Plus_NLR_Data = 'Y';
        const Deeds_Data = 'N';
        const Directors_Data = 'N';
        const RunCodix = 'N';
        const Run_CompuScore = 'Y';
        const ClientConsent = 'Y';
        const Adrs_Mandatory = 'Y';
        const Enq_Purpose = 12;

        return `
<Transactions>
  <Search_Criteria>
    <CS_Data>${CS_Data}</CS_Data>
    <CPA_Plus_NLR_Data>${CPA_Plus_NLR_Data}</CPA_Plus_NLR_Data>
    <Deeds_Data>${Deeds_Data}</Deeds_Data>
    <Directors_Data>${Directors_Data}</Directors_Data>
    <Identity_number>${dto.identityNumber}</Identity_number>
    <Surname>${dto.surname}</Surname>
    <Forename>${dto.forename}</Forename>
    <Gender>${gender}</Gender>
    <Passport_flag>${passportFlag}</Passport_flag>
    <DateOfBirth>${dto.dateOfBirth}</DateOfBirth>
    <Address1>${dto.address1}</Address1>
    <Address2>${dto.address2}</Address2>
    ${dto.address3 ? `<Address3>${dto.address3}</Address3>` : ''}
    ${dto.address4 ? `<Address4>${dto.address4}</Address4>` : ''}
    <PostalCode>${postal}</PostalCode>
    <CellTelNo>${dto.cellTelNo ?? ''}</CellTelNo>
    <ResultType>${resultType}</ResultType>
    <RunCodix>${RunCodix}</RunCodix>
    <Adrs_Mandatory>${Adrs_Mandatory}</Adrs_Mandatory>
    <Enq_Purpose>${Enq_Purpose}</Enq_Purpose>
    <Run_CompuScore>${Run_CompuScore}</Run_CompuScore>
    <ClientConsent>${ClientConsent}</ClientConsent>
    <ClientRef>${dto.clientRef ?? 'NA'}</ClientRef>
    <Enquirer>
      <EnquirerName>${dto.enquirerName}</EnquirerName>
      <EnquirerContact>${dto.enquirerContact}</EnquirerContact>
      <EnquirerTel>${dto.enquirerTel}</EnquirerTel>
    </Enquirer>
  </Search_Criteria>
</Transactions>`.trim();
    }

    // ---------- WS-Security header (optional) ----------
    private wsseHeader(): string {
        return `
<soap:Header xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <wsse:Security>
    <wsse:UsernameToken>
      <wsse:Username>${this.user}</wsse:Username>
      <wsse:Password>${this.pass}</wsse:Password>
    </wsse:UsernameToken>
  </wsse:Security>
</soap:Header>`.trim();
    }

    // ---------- SOAP Envelope builders ----------
    private soap11Envelope(innerXml: string) {
        const header = this.useWsSec ? this.wsseHeader() : '<soap:Header/>';
        return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="${this.targetNs}">
  ${header}
  <soap:Body>
    <tns:DoNormalEnquiry>
      ${innerXml}
    </tns:DoNormalEnquiry>
  </soap:Body>
</soap:Envelope>`;
    }

    private soap12Envelope(innerXml: string) {
        const header = this.useWsSec
            ? this.wsseHeader().replaceAll('<soap:', '<soap12:').replaceAll('</soap:', '</soap12:')
            : '<soap12:Header/>';
        return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:tns="${this.targetNs}">
  ${header}
  <soap12:Body>
    <tns:DoNormalEnquiry>
      ${innerXml}
    </tns:DoNormalEnquiry>
  </soap12:Body>
</soap12:Envelope>`;
    }

    // ---------- Request variants ----------
    // C: pRequest + ALL children in OP NS (tns) with UpperCamel names (Username/Password/.../Transaction)
    private buildVariantC_AllInOpNs_UpperCamel(transactionXml: string) {
        return `
<tns:pRequest>
  <tns:Username>${this.user}</tns:Username>
  <tns:Password>${this.pass}</tns:Password>
  <tns:Version>1.0</tns:Version>
  <tns:Origin>${this.origin}</tns:Origin>
  <tns:Origin_Version>${this.originVersion}</tns:Origin_Version>
  <tns:Input_Format>XML</tns:Input_Format>
  <tns:Transaction><![CDATA[${transactionXml}]]></tns:Transaction>
</tns:pRequest>`.trim();
    }

    // D: pRequest + ALL children in OP NS (tns) with legacy short names (pUsrnme/pPasswrd/.../pTransaction)
    private buildVariantD_AllInOpNs_LegacyShort(transactionXml: string) {
        return `
<tns:pRequest>
  <tns:pUsrnme>${this.user}</tns:pUsrnme>
  <tns:pPasswrd>${this.pass}</tns:pPasswrd>
  <tns:pVersion>1.0</tns:pVersion>
  <tns:pOrigin>${this.origin}</tns:pOrigin>
  <tns:pOrigin_Version>${this.originVersion}</tns:pOrigin_Version>
  <tns:pInput_Format>XML</tns:pInput_Format>
  <tns:pTransaction><![CDATA[${transactionXml}]]></tns:pTransaction>
</tns:pRequest>`.trim();
    }

    // A: pRequest in OP NS, children in TYPE NS with xsi:type (POJO-style)
    private buildVariantATyped(transactionXml: string) {
        return `
<tns:pRequest xmlns:nsType="${this.typeNs}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="nsType:NormalEnqRequestParams">
  <nsType:username>${this.user}</nsType:username>
  <nsType:password>${this.pass}</nsType:password>
  <nsType:version>1.0</nsType:version>
  <nsType:origin>${this.origin}</nsType:origin>
  <nsType:origin_Version>${this.originVersion}</nsType:origin_Version>
  <nsType:input_Format>XML</nsType:input_Format>
  <nsType:transaction><![CDATA[${transactionXml}]]></nsType:transaction>
</tns:pRequest>`.trim();
    }

    // B: pRequest in OP NS, children in TYPE NS (no xsi:type)
    private buildVariantBNoType(transactionXml: string) {
        return `
<tns:pRequest xmlns:nsType="${this.typeNs}">
  <nsType:username>${this.user}</nsType:username>
  <nsType:password>${this.pass}</nsType:password>
  <nsType:version>1.0</nsType:version>
  <nsType:origin>${this.origin}</nsType:origin>
  <nsType:origin_Version>${this.originVersion}</nsType:origin_Version>
  <nsType:input_Format>XML</nsType:input_Format>
  <nsType:transaction><![CDATA[${transactionXml}]]></nsType:transaction>
</tns:pRequest>`.trim();
    }

    // ---------- SOAP transport ----------
    private async postSoap(version: '1.2' | '1.1', innerXml: string): Promise<string> {
        const envelope =
            version === '1.2' ? this.soap12Envelope(innerXml) : this.soap11Envelope(innerXml);
        const headers: Record<string, string> =
            version === '1.2'
                ? { 'Content-Type': 'application/soap+xml; charset=utf-8' }
                : {
                      'Content-Type': 'text/xml; charset=utf-8',
                      ...(this.soapAction ? { SOAPAction: this.soapAction } : {}),
                  };

        this.logger.debug(`SOAP ${version} REQUEST:\n${envelope.substring(0, 1500)}\n---`);
        try {
            const { data } = await axios.post(this.endpoint, envelope, { headers, timeout: 30000 });
            return String(data ?? '');
        } catch (err: any) {
            const body = err?.response?.data ? String(err.response.data) : '';
            this.logger.warn(
                `HTTP ${err?.response?.status || ''} ${version} fault:\n${body.substring(0, 2000)}\n---`
            );
            throw new InternalServerErrorException(body || err?.message || 'SOAP call failed');
        }
    }

    // ---------- Response parsing ----------
    private parseCompleted(xml: string): boolean {
        const m =
            xml.match(/<pTransactionCompleted>(.*?)<\/pTransactionCompleted>/i) ||
            xml.match(/<TransactionCompleted>(.*?)<\/TransactionCompleted>/i);
        return m ? String(m[1]).toLowerCase() === 'true' : false;
    }

    private parseRetData(xml: string): string | null {
        const m =
            xml.match(/<retData>([\s\S]*?)<\/retData>/i) ||
            xml.match(/<RetData>([\s\S]*?)<\/RetData>/i);
        return m ? (m[1]?.trim() ?? null) : null;
    }

    private parseFault(xml: string): string | null {
        const m =
            xml.match(/<faultstring>([\s\S]*?)<\/faultstring>/i) ||
            xml.match(/<soap:Fault>([\s\S]*?)<\/soap:Fault>/i);
        return m ? (m[1]?.trim() ?? null) : null;
    }

    // ---------- Public API ----------
    async getCreditAssessmentPdf(dto: CreditAssessmentRequestDto): Promise<PdfResult> {
        await this.ensureInit();
        const tx = this.txXml(dto);

        // Try the shapes most Java servers expect first (all in tns), then type-ns variants.
        const attempts: Array<{ label: string; version: '1.2' | '1.1'; body: string }> = [
            {
                label: 'SOAP12 + all-tns UpperCamel',
                version: '1.2',
                body: this.buildVariantC_AllInOpNs_UpperCamel(tx),
            },
            {
                label: 'SOAP11 + all-tns UpperCamel',
                version: '1.1',
                body: this.buildVariantC_AllInOpNs_UpperCamel(tx),
            },
            {
                label: 'SOAP12 + all-tns legacyShort',
                version: '1.2',
                body: this.buildVariantD_AllInOpNs_LegacyShort(tx),
            },
            {
                label: 'SOAP11 + all-tns legacyShort',
                version: '1.1',
                body: this.buildVariantD_AllInOpNs_LegacyShort(tx),
            },
            {
                label: 'SOAP12 + typed (children in typeNs)',
                version: '1.2',
                body: this.buildVariantATyped(tx),
            },
            {
                label: 'SOAP12 + noType (children in typeNs)',
                version: '1.2',
                body: this.buildVariantBNoType(tx),
            },
            {
                label: 'SOAP11 + typed (children in typeNs)',
                version: '1.1',
                body: this.buildVariantATyped(tx),
            },
            {
                label: 'SOAP11 + noType (children in typeNs)',
                version: '1.1',
                body: this.buildVariantBNoType(tx),
            },
        ];

        let lastErr: any = null;
        for (const a of attempts) {
            try {
                this.logger.log(`DoNormalEnquiry → ${a.label}`);
                const xml = await this.postSoap(a.version, a.body);

                const fault = this.parseFault(xml);
                if (fault) {
                    this.logger.warn(`[${a.label}] Fault: ${fault}`);
                    lastErr = new Error(fault);
                    continue;
                }

                if (!this.parseCompleted(xml)) {
                    const code =
                        xml.match(/<errorCode>(.*?)<\/errorCode>/i)?.[1] ??
                        xml.match(/<ErrorCode>(.*?)<\/ErrorCode>/i)?.[1] ??
                        '';
                    const msg =
                        xml.match(/<errorString>([\s\S]*?)<\/errorString>/i)?.[1] ??
                        xml.match(/<ErrorString>([\s\S]*?)<\/ErrorString>/i)?.[1] ??
                        'Unknown Experian error';
                    throw new BadRequestException(`Experian service error ${code} ${msg}`.trim());
                }

                const base64 = this.parseRetData(xml);
                if (!base64)
                    throw new BadRequestException(
                        'retData missing in successful Experian response.'
                    );

                const buf = Buffer.from(base64, 'base64');
                return {
                    filename: `CreditAssessment_${dto.identityNumber}.pdf`,
                    mime: 'application/pdf',
                    buf,
                };
            } catch (e: any) {
                this.logger.warn(`[Attempt failed] ${a.label}: ${e?.message || e}`);
                lastErr = e;
            }
        }
        throw new InternalServerErrorException(lastErr?.message || 'DoNormalEnquiry failed');
    }
}
