// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { importFileMock, importPathMock } = vi.hoisted(() => ({
    importFileMock: vi.fn(),
    importPathMock: vi.fn(),
}));

vi.mock('@/api/leads.api', () => ({
    importLeadsFromFile: importFileMock,
    importLeadsFromPath: importPathMock,
}));

let LeadsImport: ComponentType;
let container: HTMLDivElement;
let root: Root;

const renderScreen = async () => {
    await act(async () => root.render(<LeadsImport />));
};

const chooseFile = async (file: File) => {
    const input = container.querySelector<HTMLInputElement>('#csvFileInput');
    if (!input) throw new Error('CSV input not rendered');
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
};

const changeValue = async (input: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
        setter?.call(input, value);
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });
};

const clickButton = async (label: string) => {
    const button = [...container.querySelectorAll('button')].find(
        (item) => item.textContent === label
    );
    if (!button) throw new Error(`${label} button not rendered`);
    await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    LeadsImport = (await import('../LeadsImport')).default;
});

beforeEach(() => {
    importFileMock.mockReset().mockResolvedValue({ success: true, inserted: 3, updated: 2 });
    importPathMock.mockReset().mockResolvedValue({ success: true, inserted: 1, updated: 4 });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
});

describe('LeadsImport', () => {
    it('renders both compact import workflows and the CSV contract', async () => {
        await renderScreen();
        expect(container.textContent).toContain('Upload CSV file');
        expect(container.textContent).toContain('Import from server');
        expect(container.textContent).toContain('Time Received');
        expect(container.textContent).toContain('Lead Outcome');
        expect(container.querySelectorAll('.leads-import-panel')).toHaveLength(2);
    });

    it('rejects non-CSV and oversized files before calling the API', async () => {
        await renderScreen();
        await chooseFile(new File(['text'], 'leads.txt', { type: 'text/plain' }));
        expect(container.textContent).toContain('Please select a CSV file');

        const largeFile = new File(['csv'], 'large.csv', { type: 'text/csv' });
        Object.defineProperty(largeFile, 'size', { value: 20 * 1024 * 1024 + 1 });
        await chooseFile(largeFile);
        expect(container.textContent).toContain('File size must be less than 20MB');
        expect(importFileMock).not.toHaveBeenCalled();
    });

    it('accepts case-insensitive CSV names and shows the file import result', async () => {
        await renderScreen();
        const file = new File(['Cell\n0820000000'], 'LEADS.CSV', { type: 'text/csv' });
        await chooseFile(file);
        expect(container.textContent).toContain('LEADS.CSV');

        await clickButton('Upload and import');
        await vi.waitFor(() => expect(importFileMock).toHaveBeenCalledWith(file));
        expect(container.textContent).toContain('Import completed');
        expect(container.textContent).toContain('Total processed');
        expect(container.textContent).toContain('5');
    });

    it('trims the server path and displays its result', async () => {
        await renderScreen();
        const path = container.querySelector<HTMLInputElement>('#serverFilePath');
        if (!path) throw new Error('Server path input not rendered');
        await changeValue(path, '  /var/data/leads.csv  ');
        await clickButton('Import from server');

        await vi.waitFor(() => expect(importPathMock).toHaveBeenCalledWith('/var/data/leads.csv'));
        expect(container.textContent).toContain('Import completed');
        expect(path.value).toBe('');
    });

    it('keeps API failures visible and dismissible', async () => {
        importPathMock.mockRejectedValueOnce(new Error('Server file was not found'));
        await renderScreen();
        const path = container.querySelector<HTMLInputElement>('#serverFilePath');
        if (!path) throw new Error('Server path input not rendered');
        await changeValue(path, '/missing.csv');
        await clickButton('Import from server');

        await vi.waitFor(() =>
            expect(container.textContent).toContain('Server file was not found')
        );
        expect(container.querySelector('[role="alert"]')).not.toBeNull();
        await clickButton('×');
        expect(container.querySelector('[role="alert"]')).toBeNull();
    });

    it('disables both workflows and exposes progress while an import is running', async () => {
        let resolveImport:
            | ((value: { success: boolean; inserted: number; updated: number }) => void)
            | undefined;
        importFileMock.mockReturnValueOnce(
            new Promise((resolve) => {
                resolveImport = resolve;
            })
        );
        await renderScreen();
        await chooseFile(new File(['Cell'], 'leads.csv', { type: 'text/csv' }));
        await clickButton('Upload and import');

        expect(container.querySelector('[role="status"]')?.textContent).toContain(
            'Import in progress'
        );
        expect(container.querySelector<HTMLInputElement>('#serverFilePath')?.disabled).toBe(true);
        expect(
            [...container.querySelectorAll('button')].filter((button) => button.disabled).length
        ).toBeGreaterThanOrEqual(2);

        await act(async () => resolveImport?.({ success: true, inserted: 1, updated: 0 }));
    });
});
