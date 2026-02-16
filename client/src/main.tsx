import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import ProductDetail from './pages/ProductDetail'
import Login from './pages/Login.tsx'
import Register from './pages/Register.tsx'
import Profile from './pages/Profile.tsx'
import Checkout from './pages/Checkout.tsx'
import PaymentConfirmation from './pages/PaymentConfirmation.tsx'
import AuthCallback from './pages/AuthCallback.tsx'
import TermsAndConditions from './pages/TermsAndConditions.tsx'
import PrivacyPolicy from './pages/PrivacyPolicy.tsx'
import CookiesPolicy from './pages/CookiesPolicy.tsx'
import NotFound from './pages/NotFound.tsx'
import HowItWorks from './pages/HowItWorks.tsx'
import SellInfo from './pages/SellInfo.tsx'
import BuyInfo from './pages/BuyInfo.tsx'
import { CartProvider } from './context/cartContext'
import { Toaster } from "@/components/ui/sonner"
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment-confirmation" element={<PaymentConfirmation />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/terminos-y-condiciones" element={<TermsAndConditions />} />
          <Route path="/politica-de-privacidad" element={<PrivacyPolicy />} />
          <Route path="/politica-de-cookies" element={<CookiesPolicy />} />
          <Route path="/como-funciona" element={<HowItWorks />} />
          <Route path="/info-vender" element={<SellInfo />} />
          <Route path="/info-comprar" element={<BuyInfo />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </CartProvider>
  </React.StrictMode>,
)