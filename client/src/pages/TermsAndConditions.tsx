import { Link } from "react-router-dom";
import LogoImage from "../assets/Logo.webp";
import { Footer } from "../components/Footer";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFB]">
      <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={LogoImage} alt="MiVitrina Logo" className="h-12 w-auto object-contain" />
          </Link>
          <Link to="/" className="text-sm font-semibold text-[#9B5F71] hover:underline">
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <h1 className="text-3xl font-black text-slate-900">Términos y condiciones</h1>
          <p className="mt-2 text-sm text-slate-500">Última actualización: 16 de febrero de 2026</p>

          <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
            <section>
              <h2 className="text-base font-bold text-slate-900">1. Uso de la plataforma</h2>
              <p>
                MiVitrina facilita la publicación, compra y venta de productos entre usuarios.
                Al usar la plataforma, aceptas actuar de buena fe y cumplir la normativa aplicable.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">2. Cuenta de usuario</h2>
              <p>
                Eres responsable de mantener la confidencialidad de tus credenciales y de la actividad
                registrada en tu cuenta.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">3. Publicaciones y transacciones</h2>
              <p>
                La información de los productos debe ser veraz. MiVitrina puede moderar contenido que
                incumpla políticas internas o legislación vigente.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">4. Limitación de responsabilidad</h2>
              <p>
                MiVitrina provee la infraestructura tecnológica de intermediación y no garantiza la
                disponibilidad ininterrumpida del servicio.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">5. Contacto</h2>
              <p>Para dudas legales o soporte, escríbenos a contacto@mivitrina.com.</p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}