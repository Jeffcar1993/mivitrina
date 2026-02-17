import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CartProvider } from './context/cartContext'
import { Toaster } from "@/components/ui/sonner"
import './index.css'

const App = lazy(() => import('./App.tsx'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Login = lazy(() => import('./pages/Login.tsx'))
const Register = lazy(() => import('./pages/Register.tsx'))
const Profile = lazy(() => import('./pages/Profile.tsx'))
const Checkout = lazy(() => import('./pages/Checkout.tsx'))
const PaymentConfirmation = lazy(() => import('./pages/PaymentConfirmation.tsx'))
const AuthCallback = lazy(() => import('./pages/AuthCallback.tsx'))
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions.tsx'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.tsx'))
const CookiesPolicy = lazy(() => import('./pages/CookiesPolicy.tsx'))
const Finance = lazy(() => import('./pages/Finance.tsx'))
const NotFound = lazy(() => import('./pages/NotFound.tsx'))
const HowItWorks = lazy(() => import('./pages/HowItWorks.tsx'))
const SellInfo = lazy(() => import('./pages/SellInfo.tsx'))
const BuyInfo = lazy(() => import('./pages/BuyInfo.tsx'))

function ScrollToTop() {
  const { pathname } = useLocation()

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense
            fallback={
              <div className="flex h-screen w-full flex-col items-center justify-center bg-white">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#C05673]" />
                <p className="mt-4 text-sm font-medium text-slate-500">Cargando...</p>
              </div>
            }
          >
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
              <Route path="/finanzas" element={<Finance />} />
              <Route path="/como-funciona" element={<HowItWorks />} />
              <Route path="/info-vender" element={<SellInfo />} />
              <Route path="/info-comprar" element={<BuyInfo />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Toaster position="top-right" />
        </BrowserRouter>
      </CartProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)