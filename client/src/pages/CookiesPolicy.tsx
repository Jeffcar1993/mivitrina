import { Link } from "react-router-dom";
import LogoImage from "../assets/logotipo.png";
import { Footer } from "../components/Footer";

export default function CookiesPolicy() {
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

      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <h1 className="text-3xl font-black text-slate-900">Política de cookies</h1>
          <p className="mt-2 text-sm text-slate-500">Última actualización: 16 de febrero de 2026</p>

          <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
            <section>
              <h2 className="text-base font-bold text-slate-900">1. ¿Qué son las cookies?</h2>
              <p>
                Son archivos pequeños que se almacenan en tu navegador para recordar preferencias,
                mejorar rendimiento y analizar uso de la plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">2. Tipos de cookies que usamos</h2>
              <p>
                Usamos cookies esenciales para inicio de sesión y funcionamiento, y cookies analíticas
                para mejorar funcionalidades.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">3. Gestión de cookies</h2>
              <p>
                Puedes bloquear o eliminar cookies desde la configuración de tu navegador, aunque esto
                puede afectar el funcionamiento de algunas secciones.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">4. Cambios en esta política</h2>
              <p>
                Podemos actualizar esta política para reflejar mejoras o requerimientos legales.
                Publicaremos siempre la fecha de última actualización.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}