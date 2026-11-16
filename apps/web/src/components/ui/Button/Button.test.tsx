import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Button from './Button';

describe('Button', () => {
    it('renders the requested variant and label', () => {
        const markup = renderToStaticMarkup(<Button variant="success">Save</Button>);

        expect(markup).toContain('btn-success');
        expect(markup).toContain('Save');
    });

    it('disables the control while loading', () => {
        const markup = renderToStaticMarkup(<Button isLoading>Save</Button>);

        expect(markup).toContain('disabled');
        expect(markup).toContain('Loading...');
    });
});
