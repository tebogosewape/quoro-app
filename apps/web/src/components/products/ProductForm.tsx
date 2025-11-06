import { useState } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import type { Product, ProductCategory, ProductStatus } from '@/interfaces/Product';

const categories: ProductCategory[] = ['value_added', 'debt_review', 'legal_support'];
const statuses: ProductStatus[] = ['active', 'inactive', 'archived'];

type Props = {
    show: boolean;
    onClose: () => void;
    onSubmit: (values: Partial<Product>) => Promise<void>;
    initial?: Partial<Product>;
};

export default function ProductForm({ show, onClose, onSubmit, initial }: Props) {
    const [values, setValues] = useState<Partial<Product>>({
        code: initial?.code ?? '',
        name: initial?.name ?? '',
        category: (initial?.category ?? 'value_added') as Product['category'],
        status: (initial?.status ?? 'active') as Product['status'],
        requires_mandate: initial?.requires_mandate ?? false,
        requires_credit_pull: initial?.requires_credit_pull ?? false,
        description: initial?.description ?? '',
        pricing_options: initial?.pricing_options ?? undefined,
        agent_commission_rules: initial?.agent_commission_rules ?? undefined,
        fee_structure: initial?.fee_structure ?? undefined,
        capture_restrictions: initial?.capture_restrictions ?? undefined,
    });
    const [saving, setSaving] = useState(false);

    const set = (k: keyof Product, v: any) => setValues((s) => ({ ...s, [k]: v }));

    async function handleSubmit() {
        setSaving(true);
        try {
            await onSubmit(values);
            onClose();
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal show={show} onHide={onClose} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>{initial?.id ? 'Edit product' : 'Add product'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Row className="g-2">
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label className="small">Code</Form.Label>
                            <Form.Control
                                size="sm"
                                value={values.code || ''}
                                onChange={(e) => set('code', e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={8}>
                        <Form.Group>
                            <Form.Label className="small">Name</Form.Label>
                            <Form.Control
                                size="sm"
                                value={values.name || ''}
                                onChange={(e) => set('name', e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                </Row>

                <Row className="g-2 mt-1">
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label className="small">Category</Form.Label>
                            <Form.Select
                                size="sm"
                                value={values.category}
                                onChange={(e) => set('category', e.target.value)}
                            >
                                {categories.map((c) => (
                                    <option key={c} value={c}>
                                        {c.replace('_', ' ')}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label className="small">Status</Form.Label>
                            <Form.Select
                                size="sm"
                                value={values.status}
                                onChange={(e) => set('status', e.target.value)}
                            >
                                {statuses.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={2} className="d-flex align-items-end">
                        <Form.Check
                            type="switch"
                            id="requires_mandate"
                            label="Mandate"
                            checked={!!values.requires_mandate}
                            onChange={(e) => set('requires_mandate', e.currentTarget.checked)}
                        />
                    </Col>
                    <Col md={2} className="d-flex align-items-end">
                        <Form.Check
                            type="switch"
                            id="requires_credit_pull"
                            label="Credit Pull"
                            checked={!!values.requires_credit_pull}
                            onChange={(e) => set('requires_credit_pull', e.currentTarget.checked)}
                        />
                    </Col>
                </Row>

                <Row className="g-2 mt-1">
                    <Col>
                        <Form.Group>
                            <Form.Label className="small">Description</Form.Label>
                            <Form.Control
                                size="sm"
                                as="textarea"
                                rows={3}
                                value={values.description || ''}
                                onChange={(e) => set('description', e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                </Row>

                {/* Advanced JSON fields (optional quick edit) */}
                <Row className="g-2 mt-1">
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label className="small">Pricing Options (JSON)</Form.Label>
                            <Form.Control
                                size="sm"
                                as="textarea"
                                rows={3}
                                value={
                                    values.pricing_options
                                        ? JSON.stringify(values.pricing_options, null, 2)
                                        : ''
                                }
                                onChange={(e) =>
                                    set(
                                        'pricing_options',
                                        e.target.value ? JSON.parse(e.target.value) : undefined
                                    )
                                }
                            />
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label className="small">Commission Rules (JSON)</Form.Label>
                            <Form.Control
                                size="sm"
                                as="textarea"
                                rows={3}
                                value={
                                    values.agent_commission_rules
                                        ? JSON.stringify(values.agent_commission_rules, null, 2)
                                        : ''
                                }
                                onChange={(e) =>
                                    set(
                                        'agent_commission_rules',
                                        e.target.value ? JSON.parse(e.target.value) : undefined
                                    )
                                }
                            />
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label className="small">Fee Structure (JSON)</Form.Label>
                            <Form.Control
                                size="sm"
                                as="textarea"
                                rows={3}
                                value={
                                    values.fee_structure
                                        ? JSON.stringify(values.fee_structure, null, 2)
                                        : ''
                                }
                                onChange={(e) =>
                                    set(
                                        'fee_structure',
                                        e.target.value ? JSON.parse(e.target.value) : undefined
                                    )
                                }
                            />
                        </Form.Group>
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="light" size="sm" onClick={onClose}>
                    Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
