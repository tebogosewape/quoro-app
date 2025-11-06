export type TransactionProgress = {
    inProgress: number;
    completed: number;
};

export type TransferSummaryItem = {
    codeFrom: string;
    codeTo: string;
    date: string;
    quantity: number;
    type: string;
    receiptId: number;
    isProcessed: boolean;
    status: string;
};

export type TransactionSummaryResponse = {
    warehouse: TransactionProgress;
    rbm: TransactionProgress;
    mde: TransactionProgress;
    dsa: TransactionProgress;
    transferSummaryData: TransferSummaryItem[];
};
