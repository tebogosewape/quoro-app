export type Todo = { id: string; due: string; text: string; assignee?: string; done?: boolean };
export type Note = { id: string; time: string; by: string; text: string };
export type Product = {
    id: string;
    name: string;
    status: string;
    fields?: Record<string, string>;
    feeNote?: string;
    flag?: 'green' | 'amber' | 'red';
};
export type MoneyRow = { id: string; label: string; amount: number };
export type IncomeExpense = {
    income: MoneyRow[]; // A: monthly income items
    deductions: MoneyRow[]; // B: salary deductions
    expenses: MoneyRow[]; // C: living/other monthly expenses
};
export type WhatsMsg = {
    id: string;
    from: 'agent' | 'client' | 'system';
    time: string; // ISO
    text: string;
    status?: 'sent' | 'delivered' | 'read';
};
export type Correspondence = {
    emailLog: Note[];
    smsLog: Note[];
    whatsapp: WhatsMsg[];
};

export type ClientDetailPayload = {
    id: string;
    name: string;
    meta: string;
    phone: string;
    email: string;
    nationalId: string;
    lastUpdate: string;
    lastPhone: string;
    onboardingLocked: boolean;

    // UI header chips (optional usage)
    headerChips: Array<{ label: string; value: string }>;

    // Real API-aligned fields (optional, populated when using real backend)
    maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
    dateOfBirth?: string; // YYYY-MM-DD
    physicalAddress?: string;
    postalAddress?: string;
    monthlyIncome?: number;
    monthlyExpenses?: number;
    totalDebt?: number;
    creditScore?: number;
    createdAt?: string; // ISO
    updatedAt?: string; // ISO

    products: Product[];
    todos: Todo[];
    notes: Note[];
    systemLog: Note[];
    financialLog: Note[];

    incomeExpense: IncomeExpense;
    correspondence: Correspondence;
};

// ------------------------------------------------------------
// Seed memory
// ------------------------------------------------------------
const now = () => new Date().toISOString();

const seededIE: IncomeExpense = {
    income: [
        { id: 'A1', label: 'Gross Salary', amount: 22000 },
        { id: 'A2', label: 'Housing Allowance', amount: 0 },
    ],
    deductions: [
        { id: 'B1', label: 'TAX', amount: 5000 },
        { id: 'B2', label: 'Medical Aid', amount: 0 },
        { id: 'B3', label: 'UIF', amount: 0 },
    ],
    expenses: [
        { id: 'C1', label: 'Food & Groceries', amount: 3600 },
        { id: 'C2', label: 'Transport', amount: 800 },
        { id: 'C3', label: 'Other', amount: 300 },
    ],
};

const memory: Record<string, ClientDetailPayload> = {
    KH12919: {
        id: 'KH12919',
        name: 'Mr KT PHALATSE',
        meta: 'Single • Male • Tswana',
        phone: '0788566498',
        email: 'mikezizo09@gmail.com',
        nationalId: '80051354600088',
        lastUpdate: '1 day ago',
        lastPhone: 'Tue, 17 Sep 2024',
        onboardingLocked: true,

        headerChips: [
            { label: 'ID', value: '80051354600088' },
            { label: 'Last update', value: '1 day ago' },
            { label: 'Last phone', value: 'Tue, 17 Sep 2024' },
        ],

        products: [
            {
                id: 'p2',
                name: 'Debt Review Cancellation (Single)',
                status: 'Documents Outstanding',
                flag: 'amber',
                fields: {
                    Registered: '18 Jul 2024',
                    Agent: 'Chris Mutayiki',
                    Affiliate: '3 Way Loan declined',
                    Admin: 'Catherine',
                    Verified: '18 Jul 2024, 10:24',
                },
                feeNote: 'Fee: Monthly payments over 3 months: R 3,150.00 per month. (Debit order)',
            },
            {
                id: 'p1',
                name: 'Debt Review Assessment',
                status: 'Finalised',
                flag: 'green',
            },
            {
                id: 'p3',
                name: 'Credit Interpretation Report (Experian)',
                status: 'Finalised',
                flag: 'green',
            },
        ],

        todos: [
            { id: 't1', due: '2024-12-02', text: 'Await docs / DRC', assignee: 'Catherine' },
            { id: 't2', due: '2024-08-30', text: 'Payment reminder', assignee: 'Chris Mutayiki' },
            { id: 't3', due: '2024-07-31', text: 'Payment reminder', assignee: 'Chris Mutayiki' },
        ],

        notes: [
            {
                id: 'n1',
                time: '2025-07-01T14:46:00.000Z',
                by: 'Tsebiso',
                text: 'Called next of kin; new number provided.',
            },
            {
                id: 'n2',
                time: '2025-07-01T11:37:00.000Z',
                by: 'Tsebiso',
                text: 'WhatsApp sent to 078 856 6498.',
            },
        ],

        systemLog: [
            { id: 's1', time: now(), by: 'System', text: 'Client created via onboarding' },
            {
                id: 's2',
                time: now(),
                by: 'System',
                text: 'Onboarding is LOCKED - verification required',
            },
        ],

        financialLog: [{ id: 'f1', time: now(), by: 'System', text: 'Payment schedule generated' }],

        incomeExpense: seededIE,

        correspondence: {
            emailLog: [
                {
                    id: 'e1',
                    time: now(),
                    by: 'System',
                    text: 'Welcome email sent to client',
                },
            ],
            smsLog: [
                {
                    id: 'sm1',
                    time: now(),
                    by: 'System',
                    text: 'Verification code SMS sent',
                },
            ],
            whatsapp: [
                {
                    id: 'w1',
                    from: 'agent',
                    time: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
                    text: 'Hi KT, welcome to QFinance 👋. We’ll help get your credit back on track.',
                    status: 'read',
                },
                {
                    id: 'w2',
                    from: 'client',
                    time: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
                    text: 'Thank you! What documents do you need from me?',
                    status: 'read',
                },
                {
                    id: 'w3',
                    from: 'agent',
                    time: new Date(Date.now() - 1000 * 60 * 17).toISOString(),
                    text: 'Please send your ID, latest payslip, and proof of address.',
                    status: 'delivered',
                },
            ],
        },
    },
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const rid = () => Math.random().toString(36).slice(2, 10);

// ------------------------------------------------------------
// API
// ------------------------------------------------------------
export const mockClientApi = {
    async getDetails(clientId: string): Promise<ClientDetailPayload> {
        await wait();
        if (!memory[clientId]) memory[clientId] = structuredClone(memory['KH12919']);
        return structuredClone(memory[clientId]);
    },

    async saveIncomeExpense(clientId: string, data: IncomeExpense): Promise<IncomeExpense> {
        await wait(350);
        memory[clientId].incomeExpense = structuredClone(data);
        memory[clientId].systemLog.unshift({
            id: 'slog_ie_' + rid(),
            time: new Date().toISOString(),
            by: 'System',
            text: 'Income/Expense updated',
        });
        return structuredClone(memory[clientId].incomeExpense);
    },

    async addNote(clientId: string, by: string, text: string) {
        await wait(150);
        memory[clientId].notes.unshift({ id: rid(), time: now(), by, text });
        return structuredClone(memory[clientId].notes);
    },

    async addTodo(clientId: string, text: string, dueISO: string, assignee?: string) {
        await wait(150);
        memory[clientId].todos.unshift({ id: rid(), due: dueISO, text, assignee, done: false });
        return structuredClone(memory[clientId].todos);
    },

    async toggleTodo(clientId: string, todoId: string, done: boolean) {
        await wait(120);
        const t = memory[clientId].todos.find((x) => x.id === todoId);
        if (t) t.done = done;
        return structuredClone(memory[clientId].todos);
    },

    // WhatsApp: send message (agent -> client), simulate delivery/read + client reply
    async sendWhatsApp(clientId: string, text: string): Promise<WhatsMsg> {
        await wait(120);
        const msg: WhatsMsg = { id: rid(), from: 'agent', time: now(), text, status: 'sent' };
        memory[clientId].correspondence.whatsapp.push(msg);

        // simulate delivery + read
        setTimeout(() => {
            const m = memory[clientId].correspondence.whatsapp.find((x) => x.id === msg.id);
            if (m) m.status = 'delivered';
        }, 600);
        setTimeout(() => {
            const m = memory[clientId].correspondence.whatsapp.find((x) => x.id === msg.id);
            if (m) m.status = 'read';
        }, 1400);

        // simulate client reply (only for demo)
        this._simulateClientReply(clientId, text).catch(() => {});
        return structuredClone(msg);
    },

    async _simulateClientReply(clientId: string, lastText: string) {
        await wait(1800);
        const canned = [
            'Got it, I will send the payslip later today.',
            'Thanks! I’ve received the checklist.',
            'I’ve uploaded my proof of address.',
            'Can we move my debit order to the 28th?',
        ];
        const reply: WhatsMsg = {
            id: rid(),
            from: 'client',
            time: now(),
            text: canned[Math.floor(Math.random() * canned.length)],
            status: 'delivered',
        };
        // simple heuristic: if agent asked a question, reply different
        if (/\?$/.test(lastText.trim())) reply.text = 'Yes, that works for me.';

        memory[clientId].correspondence.whatsapp.push(reply);
    },
};
