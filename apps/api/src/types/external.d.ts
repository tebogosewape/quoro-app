declare module 'imapflow' {
    interface AuthOptions {
        user: string;
        pass: string;
    }

    interface ImapFlowOptions {
        host: string;
        port: number;
        secure: boolean;
        auth: AuthOptions;
    }

    interface MailboxLock {
        release(): void | Promise<void>;
    }

    export interface ImapMessage {
        source?: Buffer;
        envelope?: unknown;
        uid?: number;
        flags?: string[];
    }

    export class ImapFlow {
        constructor(options: ImapFlowOptions);
        connect(): Promise<void>;
        logout(): Promise<void>;
        getMailboxLock(mailbox: string): Promise<MailboxLock>;
        search(query: unknown): Promise<number[]>;
        fetchOne(sequence: number, options: unknown): Promise<ImapMessage>;
        messageFlagsAdd(sequence: number, flags: string[]): Promise<void>;
    }
}

declare module 'mailparser' {
    export interface Attachment {
        filename?: string | null;
        contentType?: string;
        contentDisposition?: string;
        contentId?: string;
        checksum?: string;
        size?: number;
        content: Buffer;
        cid?: string;
    }

    export interface AddressObject {
        address?: string | null;
        name?: string;
    }

    export interface ParsedMail {
        subject?: string;
        text?: string;
        textAsHtml?: string;
        html?: string;
        messageId?: string;
        references?: string[];
        inReplyTo?: string;
        from?: { value: AddressObject[] };
        to?: { value: AddressObject[] };
        attachments?: Attachment[];
    }

    export function simpleParser(source: Buffer | string): Promise<ParsedMail>;
}
