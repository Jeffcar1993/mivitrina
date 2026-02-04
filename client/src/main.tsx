import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import ProductDetail from './pages/ProductDetail' // La crearemos ahora
import { CartProvider } from './context/cartContext'
import { Toaster } from "@/components/ui/sonner"
import './index.css'
import Login from './pages/Login.tsx'
import Register from './pages/Register.tsx'
import Profile from './pages/Profile.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="profile" element={<Profile />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </CartProvider>
  </React.StrictMode>,
)