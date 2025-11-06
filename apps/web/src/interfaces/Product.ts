export type ProductCategory = 'value_added' | 'debt_review' | 'legal_support';
export type ProductStatus = 'active' | 'inactive' | 'archived';

export interface Product {
    id: string;
    code: string;
    name: string;
    category: ProductCategory;
    status: ProductStatus;
    requires_mandate: boolean;
    requires_credit_pull: boolean;
    pricing_options?: unknown;
    agent_commission_rules?: unknown;
    capture_restrictions?: unknown;
    description?: string;
    fee_structure?: unknown;
    status_flags?: unknown;
    createdAt: string;
    updatedAt: string;
}
