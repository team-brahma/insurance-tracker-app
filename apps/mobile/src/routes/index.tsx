import { Switch, Route, Redirect } from 'react-router-dom';
import type { RouteComponentProps } from 'react-router-dom';
import { useAuthStore } from '@features/auth/store/AuthStore.js';
import PolicyListPage from '@pages/PolicyListPage.js';
import PolicyDetailPage from '@pages/PolicyDetailPage.js';
import PolicyFormPage from '@pages/PolicyFormPage.js';
import DashboardPage from '@pages/DashboardPage.js';
import SettingsPage from '@pages/SettingsPage.js';
import UserManagementPage from '@pages/UserManagementPage.js';
import EnquiryListPage from '@pages/EnquiryListPage.js';
import EnquiryFormPage from '@pages/EnquiryFormPage.js';
import EnquiryDetailPage from '@pages/EnquiryDetailPage.js';
import ClientListPage from '@pages/ClientListPage.js';
import ClientFormPage from '@pages/ClientFormPage.js';
import ClientDetailPage from '@pages/ClientDetailPage.js';
import NotificationsPage from '@pages/NotificationsPage.js';
import PolicyTypesPage from '@pages/PolicyTypesPage.js';
import InsuranceProvidersPage from '@pages/InsuranceProvidersPage.js';
import AssociateAgentsPage from '@pages/AssociateAgentsPage.js';
import BulkImportPage from '@pages/BulkImportPage.js';

function ProtectedRoute({
  component,
  allowedRoles,
  requireOutsourced = false,
  ...rest
}: {
  component: React.ComponentType<RouteComponentProps>;
  exact?: boolean;
  path?: string;
  allowedRoles?: ('ADMIN' | 'AGENT')[];
  requireOutsourced?: boolean;
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const Component = component;
  return (
    <Route
      {...rest}
      render={(props) => {
        if (!isAuthenticated) return <Redirect to="/login" />;
        if (allowedRoles && user && !allowedRoles.includes(user.role)) {
          return <Redirect to={user.role === 'ADMIN' ? '/users' : '/policies'} />;
        }
        if (requireOutsourced && user && user.role !== 'ADMIN' && !user.isOutsourcedEnabled) {
          return <Redirect to="/policies" />;
        }
        return <Component {...props} />;
      }}
    />
  );
}

export function AppRoutes() {
  const user = useAuthStore((s) => s.user);
  return (
    <Switch>
      <ProtectedRoute exact path="/policies" component={PolicyListPage} allowedRoles={['AGENT']} />
      <ProtectedRoute
        exact
        path="/policies/new"
        component={PolicyFormPage}
        allowedRoles={['AGENT']}
      />
      <ProtectedRoute
        exact
        path="/policies/:id"
        component={PolicyDetailPage}
        allowedRoles={['AGENT']}
      />
      <ProtectedRoute
        exact
        path="/policies/:id/edit"
        component={PolicyFormPage}
        allowedRoles={['AGENT']}
      />
      <ProtectedRoute exact path="/clients" component={ClientListPage} allowedRoles={['AGENT']} />
      <ProtectedRoute
        exact
        path="/clients/new"
        component={ClientFormPage}
        allowedRoles={['AGENT']}
      />
      <ProtectedRoute
        exact
        path="/clients/:id"
        component={ClientDetailPage}
        allowedRoles={['AGENT']}
      />
      <ProtectedRoute
        exact
        path="/clients/:id/edit"
        component={ClientFormPage}
        allowedRoles={['AGENT']}
      />
      <ProtectedRoute
        exact
        path="/enquiries"
        component={EnquiryListPage}
        allowedRoles={['AGENT']}
      />
      <ProtectedRoute
        exact
        path="/enquiries/new"
        component={EnquiryFormPage}
        allowedRoles={['AGENT']}
      />
      <ProtectedRoute
        exact
        path="/enquiries/:id"
        component={EnquiryDetailPage}
        allowedRoles={['AGENT']}
      />
      <ProtectedRoute
        exact
        path="/enquiries/:id/edit"
        component={EnquiryFormPage}
        allowedRoles={['AGENT']}
      />
      <ProtectedRoute
        exact
        path="/notifications"
        component={NotificationsPage}
        allowedRoles={['AGENT']}
      />
      <ProtectedRoute exact path="/dashboard" component={DashboardPage} allowedRoles={['AGENT']} />
      <ProtectedRoute exact path="/settings" component={SettingsPage} allowedRoles={['AGENT']} />
      <ProtectedRoute
        exact
        path="/policy-types"
        component={PolicyTypesPage}
        allowedRoles={['AGENT']}
      />
      <ProtectedRoute
        exact
        path="/insurance-providers"
        component={InsuranceProvidersPage}
        allowedRoles={['AGENT']}
      />
      <ProtectedRoute
        exact
        path="/associate-agents"
        component={AssociateAgentsPage}
        allowedRoles={['AGENT']}
        requireOutsourced
      />
      <ProtectedRoute
        exact
        path="/bulk-import"
        component={BulkImportPage}
        allowedRoles={['AGENT']}
      />
      <ProtectedRoute exact path="/users" component={UserManagementPage} allowedRoles={['ADMIN']} />
      <Route
        exact
        path="/"
        render={() =>
          user?.role === 'ADMIN' ? <Redirect to="/users" /> : <Redirect to="/policies" />
        }
      />
    </Switch>
  );
}
