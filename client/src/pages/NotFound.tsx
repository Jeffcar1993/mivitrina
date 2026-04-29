import { Link } from "react-router-dom";
import LogoImage from "../assets/logotipo.png";
import { Footer } from "../components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFB]">
      <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={LogoImage} alt="MiVitrina Logo" className="h-16 w-auto object-contain md:h-20" />
          </Link>
          <Link to="/" className="text-sm font-semibold text-[#9B5F71] hover:underline">
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Error 404</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">Página no encontrada</h1>
          <p className="mt-4 text-slate-600">
            La ruta que intentaste abrir no existe o fue movida.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link to="/" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Inicio
            </Link>
            <Link to="/login" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Iniciar sesión
            </Link>
            <Link to="/register" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Crear cuenta
            </Link>
            <Link to="/profile" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Perfil
            </Link>
          </div>
          <div className="mt-8">
            <Link
              to="/"
              className="inline-flex h-11 items-center rounded-full bg-[#C05673] px-8 font-semibold text-white transition hover:bg-[#B04B68]"
            >
              Ir al catálogo
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}