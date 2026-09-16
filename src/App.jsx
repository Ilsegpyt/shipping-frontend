import {
    BrowserRouter,
    Routes,
} from 'react-router-dom';

import { AuthProvider } from './auth/AuthContext';
import { appRoutes } from './app/routes';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {appRoutes}
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;