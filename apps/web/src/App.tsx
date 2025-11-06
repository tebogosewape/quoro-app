import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AuthenticatedLayout from './components/layout/Auth/AuthenticatedLayout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Index';
import { PrivateRoute } from './components/layout/Auth/PrivateRoute';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import OnboardingWizard from './pages/Clients/OnboardingWizard';
import ClientDetails from './pages/Clients/ClientDetails';
import ClientsOverview from './pages/Clients/ClientsOverview';
import ManageRoles from './pages/Admin/ManageRoles';
import ManageProfile from './pages/Account/ManageProfile';
import UsersPage from './pages/Users/UsersPage';
import ProductsPage from './pages/Products/ProductsPage';
import CommissionSettings from './pages/Settings/CommissionSettings';
import LeadsOverview from './pages/Leads/LeadsOverview';
import LeadsImport from './pages/Leads/LeadsImport';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />

                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route element={<AuthenticatedLayout />}>
                    <Route
                        path="/dashboard"
                        element={
                            <PrivateRoute permission="view-dashboard">
                                <Dashboard />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/clients"
                        element={
                            <PrivateRoute permission="view-clients">
                                <ClientsOverview />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/clients/new"
                        element={
                            <PrivateRoute permission={['create-clients', 'manage-clients']}>
                                <OnboardingWizard />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/clients/:id"
                        element={
                            <PrivateRoute permission="view-clients">
                                <ClientDetails />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/leads"
                        element={
                            <PrivateRoute permission="view-clients">
                                <LeadsOverview />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/leads/import"
                        element={
                            <PrivateRoute permission={['create-clients', 'manage-clients']}>
                                <LeadsImport />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/account/profile"
                        element={
                            <PrivateRoute>
                                <ManageProfile />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/admin/roles"
                        element={
                            <PrivateRoute permission="roles.manage">
                                <ManageRoles />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/admin/users"
                        element={
                            <PrivateRoute permission="roles.manage">
                                <UsersPage />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/admin/products"
                        element={
                            <PrivateRoute permission="roles.manage">
                                <ProductsPage />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/admin/commission-settings"
                        element={
                            <PrivateRoute permission="roles.manage">
                                <CommissionSettings />
                            </PrivateRoute>
                        }
                    />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};

export default App;
