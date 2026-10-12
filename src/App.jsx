import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ScrollToTop from "./components/website/ScrollToTop";
import AppRoutes from "./app/routes";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;