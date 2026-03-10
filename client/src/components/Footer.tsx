import { Link } from "react-router-dom";
import LogoImage from "../assets/Logo.webp";
import VisaLogo from "../assets/visa.svg";
import MercadoPagoLogo from "../assets/mercado-pago.svg";
import { cn } from "../lib/utils";

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn("border-t border-slate-200 bg-white py-8 mt-8", className)}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center">
              <img src={LogoImage} alt="MiVitrina Logo" className="h-10 w-auto object-contain" />
            </div>
            <p className="text-sm text-slate-500">
              Tu escaparate digital para comprar y vender productos de forma segura.
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold text-slate-800">Explora</p>
            <div className="flex flex-col gap-1 text-slate-500">
              <Link to="/" className="hover:text-[#9B5F71]">Inicio</Link>
              <Link to="/como-funciona" className="hover:text-[#9B5F71]">¿Cómo funciona?</Link>
              <Link to="/login" className="hover:text-[#9B5F71]">Ingresar</Link>
              <Link to="/register" className="hover:text-[#9B5F71]">Crear cuenta</Link>
              <Link to="/info-vender" className="hover:text-[#9B5F71]">¿Cómo vender?</Link>
              <Link to="/info-comprar" className="hover:text-[#9B5F71]">¿Cómo comprar?</Link>
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-6">
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-slate-800">Soporte</p>
              <div className="flex flex-col gap-1 text-slate-500">
                <span>contacto@mivitrina.com</span>
                <span>+57 300 000 0000</span>
                <span>Atención 24/7</span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-semibold text-slate-800">Legal</p>
              <div className="flex flex-col gap-1 text-slate-500">
                <Link to="/terminos-y-condiciones" className="hover:text-[#9B5F71]">Términos y condiciones</Link>
                <Link to="/politica-de-privacidad" className="hover:text-[#9B5F71]">Política de privacidad</Link>
                <Link to="/politica-de-cookies" className="hover:text-[#9B5F71]">Política de cookies</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 w-full border-t border-slate-100 pt-5">
          <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
            <p className="text-sm font-semibold text-slate-700">Métodos de pago</p>
            <div className="flex items-center gap-3">
              <img src={VisaLogo} alt="Visa" className="h-10 w-auto rounded-md border border-slate-200 bg-white p-1" />
              <img src={MercadoPagoLogo} alt="Mercado Pago" className="h-10 w-auto rounded-md border border-slate-200 bg-white p-1" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400 md:flex-row">
          <p>© 2026 MiVitrina. Todos los derechos reservados.</p>
          <p>Hecho con amor y mucho café.</p>
        </div>
      </div>
    </footer>
  );
}