import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateProductsWithPricingStructure1730905000000 implements MigrationInterface {
    name = 'UpdateProductsWithPricingStructure1730905000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Delete existing products to start fresh
        await queryRunner.query(`DELETE FROM products`);

        // Insert products with proper pricing structure
        const products = [
            {
                code: 'CAR',
                name: 'Credit Assessment and Report',
                category: 'value_added',
                description:
                    'Mandatory for 2nd product to be added. Comprehensive credit assessment and detailed report.',
                pricing_options: JSON.stringify({
                    oneOff: 795.0,
                    instalments: [],
                }),
                agent_commission_rules: JSON.stringify({
                    firstPayment: 100.0,
                }),
                requires_credit_pull: true,
                requires_mandate: false,
            },
            {
                code: 'AD',
                name: 'Affordable Distribution',
                category: 'value_added',
                description: 'Minimum R2,000 recurring payment distribution service.',
                pricing_options: JSON.stringify({
                    oneOff: 0,
                    recurring: true,
                    minimumAmount: 2000,
                    instalments: [],
                }),
                agent_commission_rules: JSON.stringify({
                    percentage: 8,
                    applicableOn: 'first_instalment',
                }),
                requires_credit_pull: false,
                requires_mandate: true,
            },
            {
                code: 'DRR-SINGLE',
                name: 'Debt Review Removal Single Application',
                category: 'debt_review',
                description: 'Professional debt review removal service for single applicants.',
                pricing_options: JSON.stringify({
                    oneOff: 10500.0,
                    instalments: [
                        { count: 2, amount: 5250.0 },
                        { count: 3, amount: 3500.0 },
                    ],
                }),
                agent_commission_rules: JSON.stringify({
                    firstPayment: 50.0,
                }),
                requires_credit_pull: true,
                requires_mandate: false,
            },
            {
                code: 'DRR-JOINT',
                name: 'Debt Review Removal Joint Application',
                category: 'debt_review',
                description: 'Professional debt review removal service for joint applicants.',
                pricing_options: JSON.stringify({
                    oneOff: 14500.0,
                    instalments: [
                        { count: 2, amount: 7250.0 },
                        { count: 3, amount: 4835.0 },
                    ],
                }),
                agent_commission_rules: JSON.stringify({
                    firstPayment: 60.0,
                }),
                requires_credit_pull: true,
                requires_mandate: false,
            },
            {
                code: 'ADR',
                name: 'Adverse/Default Removal',
                category: 'legal_support',
                description: 'Remove adverse listings and defaults from your credit record.',
                pricing_options: JSON.stringify({
                    oneOff: 3000.0,
                    instalments: [],
                }),
                agent_commission_rules: JSON.stringify({
                    percentage: 5,
                    applicableOn: 'first_instalment',
                }),
                requires_credit_pull: true,
                requires_mandate: false,
            },
            {
                code: 'JR',
                name: 'Judgement Removal',
                category: 'legal_support',
                description: 'Professional judgement removal service.',
                pricing_options: JSON.stringify({
                    oneOff: 3000.0,
                    instalments: [
                        { count: 2, amount: 1500.0 },
                        { count: 3, amount: 1100.0 },
                    ],
                }),
                agent_commission_rules: JSON.stringify({
                    percentage: 5,
                    applicableOn: 'first_instalment',
                }),
                requires_credit_pull: true,
                requires_mandate: false,
            },
            {
                code: 'SU',
                name: 'Status Update',
                category: 'legal_support',
                description: 'Maximum R3,000. Only team leader can capture.',
                pricing_options: JSON.stringify({
                    oneOff: 0,
                    maxAmount: 3000,
                    instalments: [],
                }),
                agent_commission_rules: JSON.stringify({
                    percentage: 5,
                    applicableOn: 'first_instalment',
                }),
                capture_restrictions: JSON.stringify({
                    minRole: 'team_leader',
                }),
                requires_credit_pull: false,
                requires_mandate: false,
            },
            {
                code: 'CSB',
                name: 'Credit Score Booster',
                category: 'value_added',
                description: 'R135 recurring monthly service to improve your credit score.',
                pricing_options: JSON.stringify({
                    oneOff: 0,
                    recurring: true,
                    recurringAmount: 135.0,
                    instalments: [],
                }),
                agent_commission_rules: JSON.stringify({
                    firstPayment: 50.0,
                }),
                requires_credit_pull: false,
                requires_mandate: true,
            },
            {
                code: 'PL',
                name: 'Pre-paid Legal',
                category: 'legal_support',
                description: 'R199 recurring monthly legal protection service.',
                pricing_options: JSON.stringify({
                    oneOff: 0,
                    recurring: true,
                    recurringAmount: 199.0,
                    instalments: [],
                }),
                agent_commission_rules: JSON.stringify({
                    firstPayment: 50.0,
                }),
                requires_credit_pull: false,
                requires_mandate: true,
            },
        ];

        for (const product of products) {
            await queryRunner.query(
                `
                INSERT INTO products (
                    id,
                    code,
                    name,
                    category,
                    description,
                    status,
                    pricing_options,
                    agent_commission_rules,
                    capture_restrictions,
                    requires_credit_pull,
                    requires_mandate,
                    created_at,
                    updated_at
                ) VALUES (UUID(), ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, NOW(), NOW())
            `,
                [
                    product.code,
                    product.name,
                    product.category,
                    product.description,
                    product.pricing_options,
                    product.agent_commission_rules,
                    product.capture_restrictions || null,
                    product.requires_credit_pull,
                    product.requires_mandate,
                ]
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Delete all products inserted by this migration
        await queryRunner.query(`
            DELETE FROM products
            WHERE code IN ('CAR', 'AD', 'DRR-SINGLE', 'DRR-JOINT', 'ADR', 'JR', 'SU', 'CSB', 'PL')
        `);
    }
}
