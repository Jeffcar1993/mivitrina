/* eslint-disable react-refresh/only-export-components */
import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CartProvider } from './context/cartContext'
import { Toaster } from "@/components/ui/sonner"
import { applySeo } from './lib/seo'
import './index.css'

const App = lazy(() => import('./App.tsx'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Login = lazy(() => import('./pages/Login.tsx'))
const Register = lazy(() => import('./pages/Register.tsx'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.tsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.tsx'))
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
const SellerPayoutSetup = lazy(() => import('./pages/SellerPayoutSetup.tsx'))

function ScrollToTop() {
  const { pathname } = useLocation()

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

function RouteSeo() {
  const { pathname } = useLocation()

  React.useEffect(() => {
    const staticSeoMap: Record<string, { title: string; description: string }> = {
      '/': {
        title: 'Inicio',
        description: 'Compra y vende productos de forma segura en MiVitrina.',
      },
      '/login': {
        title: 'Iniciar sesión',
        description: 'Accede a tu cuenta para comprar y vender en MiVitrina.',
      },
      '/register': {
        title: 'Crear cuenta',
        description: 'Regístrate en MiVitrina y empieza a vender hoy mismo.',
      },
      '/como-funciona': {
        title: 'Cómo funciona',
        description: 'Conoce cómo comprar y vender en MiVitrina paso a paso.',
      },
      '/info-vender': {
        title: 'Información para vender',
        description: 'Guía para vendedores de MiVitrina y cobros automáticos.',
      },
      '/info-comprar': {
        title: 'Información para comprar',
        description: 'Guía para compradores con pagos y protección en MiVitrina.',
      },
      '/politica-de-privacidad': {
        title: 'Política de privacidad',
        description: 'Política de privacidad y tratamiento de datos de MiVitrina.',
      },
      '/politica-de-cookies': {
        title: 'Política de cookies',
        description: 'Información sobre cookies y tecnologías de seguimiento.',
      },
      '/terminos-y-condiciones': {
        title: 'Términos y condiciones',
        description: 'Términos y condiciones de uso de MiVitrina.',
      },
    }

    if (pathname.startsWith('/product/')) {
      applySeo({
        title: 'Detalle de producto',
        description: 'Consulta información, precio y disponibilidad del producto.',
        canonicalPath: pathname,
      })
      return
    }

    const routeSeo = staticSeoMap[pathname]
    if (routeSeo) {
      applySeo({
        title: routeSeo.title,
        description: routeSeo.description,
        canonicalPath: pathname,
      })
      return
    }

    applySeo({
      title: 'MiVitrina',
      description: 'Marketplace confiable para comprar y vender productos en Colombia.',
      canonicalPath: pathname,
    })
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
          <RouteSeo />
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
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
              <Route path="/configurar-cobros" element={<SellerPayoutSetup />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Toaster position="top-right" />
        </BrowserRouter>
      </CartProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)