import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Bookings, { NewBooking } from './pages/Bookings';
import Menu from './pages/Menu';
import Invoices from './pages/Invoices';
import Staff from './pages/Staff';
import Inventory from './pages/Inventory';
import Calendar from './pages/Calendar';
import Messages from './pages/Messages';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={
            <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
          } />

          <Route path="/bookings" element={
            <ProtectedRoute><Layout><Bookings /></Layout></ProtectedRoute>
          } />
          <Route path="/bookings/new" element={
            <ProtectedRoute><Layout><NewBooking /></Layout></ProtectedRoute>
          } />
          <Route path="/bookings/:id" element={
            <ProtectedRoute><Layout><Bookings /></Layout></ProtectedRoute>
          } />

          <Route path="/menu" element={
            <ProtectedRoute><Layout><Menu /></Layout></ProtectedRoute>
          } />

          <Route path="/invoices" element={
            <ProtectedRoute><Layout><Invoices /></Layout></ProtectedRoute>
          } />

          <Route path="/staff" element={
            <ProtectedRoute roles={['admin']}><Layout><Staff /></Layout></ProtectedRoute>
          } />

          <Route path="/inventory" element={
            <ProtectedRoute roles={['admin']}><Layout><Inventory /></Layout></ProtectedRoute>
          } />

          <Route path="/calendar" element={
            <ProtectedRoute roles={['admin']}><Layout><Calendar /></Layout></ProtectedRoute>
          } />

          <Route path="/messages" element={
            <ProtectedRoute><Layout><Messages /></Layout></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
