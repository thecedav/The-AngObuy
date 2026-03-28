import { BrowserRouter as Router } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { AppRoutes } from '@/app/routes';

export default function App() {
  return (
    <Router>
      <Layout>
        <AppRoutes />
      </Layout>
    </Router>
  );
}
