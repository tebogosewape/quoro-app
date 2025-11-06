import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '@/styles/base/variables.css';
import '@/styles/theme/index.css';
import '@/styles/global.css';
import '@/styles/surface-dark.css';
import App from './App.tsx';
import { AppProviders } from './providers/AppProviders';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppProviders>
            <App />
        </AppProviders>
    </StrictMode>
);
