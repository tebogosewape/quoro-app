declare module 'imapflow' {
    /**
     * IMAP client configuration options
     */
    export type ImapFlowOptions = {
        host: string;
        port: number;
        secure: boolean;
        auth: {
            user: string;
            pass: string;
        };
        logger?: boolean | Console;
        connectionTimeout?: number;
        greetingTimeout?: number;
        socketTimeout?: number;
    };

    /**
     * Extended IMAP config for service usage
     */
    export type ImapConfig = ImapFlowOptions & {
        mailbox: string;
        limit: number;
        retries?: number;
        retryDelay?: number;
    };

    /**
     * Mailbox information object
     */
    export interface MailboxObject {
        path: string;
        name?: string;
        delimiter?: string;
        flags?: string[];
        exists?: number;
        recent?: number;
        unseen?: number;
        messages?: number;
        uidValidity?: number;
        uidNext?: number;
        permanentFlags?: string[];
        marked?: boolean;
        unmarked?: boolean;
    }

    /**
     * Message flags object
     */
    export interface MessageFlags {
        seen?: boolean;
        answered?: boolean;
        flagged?: boolean;
        deleted?: boolean;
        draft?: boolean;
    }

    /**
     * Fetch query options
     */
    export interface FetchQueryOptions {
        envelope?: boolean;
        source?: boolean;
        flags?: boolean;
        bodyStructure?: boolean;
        headers?: string[] | boolean;
        bodyParts?: string[];
        structure?: boolean;
        uid?: boolean;
        internalDate?: boolean;
        size?: boolean;
    }

    /**
     * Message envelope with address details
     */
    export interface MessageEnvelope {
        date?: Date;
        subject?: string;
        from?: Array<{ name?: string; address?: string }>;
        sender?: Array<{ name?: string; address?: string }>;
        replyTo?: Array<{ name?: string; address?: string }>;
        to?: Array<{ name?: string; address?: string }>;
        cc?: Array<{ name?: string; address?: string }>;
        bcc?: Array<{ name?: string; address?: string }>;
        inReplyTo?: string;
        messageId?: string;
    }

    /**
     * IMAP message with metadata
     */
    export interface ImapMessage {
        uid: number;
        flags?: Set<string>;
        envelope?: MessageEnvelope;
        source?: Buffer | string;
        headers?: Map<string, string | string[]>;
        bodyStructure?: unknown;
        modseq?: bigint;
        emailId?: string;
        threadId?: string;
        labels?: string[];
    }

    /**
     * Async iterable fetch stream with event support
     */
    export interface FetchStream extends AsyncIterable<ImapMessage> {
        on(event: 'error', listener: (error: Error) => void): this;
        on(event: 'end', listener: () => void): this;
        destroy?(): void;
    }

    /**
     * IMAP client interface definition
     */
    export interface ImapFlow {
        connect(): Promise<void>;
        logout(): Promise<void>;
        close(): Promise<void>;
        select(path: string): Promise<MailboxObject>;
        status(path: string): Promise<MailboxObject>;
        fetch(range: string, options: FetchQueryOptions): FetchStream;
        download(range: string, options: FetchQueryOptions): FetchStream;
        search(query: Record<string, unknown>): Promise<number[]>;
        list(reference?: string, mailbox?: string): Promise<MailboxObject[]>;
        mailboxes(): Promise<Map<string, MailboxObject>>;
        getMailbox(path: string): Promise<MailboxObject | undefined>;
    }

    /**
     * Default ImapFlow client class
     */
    export default class ImapFlowClient implements ImapFlow {
        constructor(options: ImapFlowOptions);
        connect(): Promise<void>;
        logout(): Promise<void>;
        close(): Promise<void>;
        select(path: string): Promise<MailboxObject>;
        status(path: string): Promise<MailboxObject>;
        fetch(range: string, options: FetchQueryOptions): FetchStream;
        download(range: string, options: FetchQueryOptions): FetchStream;
        search(query: Record<string, unknown>): Promise<number[]>;
        list(reference?: string, mailbox?: string): Promise<MailboxObject[]>;
        mailboxes(): Promise<Map<string, MailboxObject>>;
        getMailbox(path: string): Promise<MailboxObject | undefined>;
    }
}
