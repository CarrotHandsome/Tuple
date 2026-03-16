import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Groups from './pages/Groups';
import Chat from './pages/Chat';
import { useEffect } from 'react';
import axios from 'axios';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { token } = useAuth();
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401) {
          logout();
          navigate('/login');
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);
  return (
    <Routes>
      <Route path="/login"    element={token ? <Navigate to="/groups" replace /> : <Login />} />
      <Route path="/register" element={token ? <Navigate to="/groups" replace /> : <Register />} />
      <Route path="/groups"   element={<ProtectedRoute><Groups /></ProtectedRoute>} />
      <Route path="/groups/:id/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="*"         element={<Navigate to={token ? '/groups' : '/login'} replace />} />
    </Routes>
  );
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
