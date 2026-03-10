import { Link } from "react-router-dom";
import LogoImage from "../assets/Logo.webp";
import { Footer } from "../components/Footer";

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-black text-slate-900">Política de privacidad</h1>
          <p className="mt-2 text-sm text-slate-500">Última actualización: 16 de febrero de 2026</p>

          <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
            <section>
              <h2 className="text-base font-bold text-slate-900">1. Datos que recopilamos</h2>
              <p>
                Recopilamos datos de registro, contacto y actividad dentro de la plataforma para operar
                correctamente el servicio.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">2. Finalidad del tratamiento</h2>
              <p>
                Usamos la información para autenticar usuarios, gestionar compras, ventas, soporte y
                mejorar la experiencia general.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">3. Compartición de información</h2>
              <p>
                Solo compartimos datos cuando es necesario para procesar pagos, cumplir obligaciones
                legales o prestar funcionalidades esenciales.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">4. Seguridad</h2>
              <p>
                Implementamos medidas técnicas y organizativas razonables para proteger la información
                personal de accesos no autorizados.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">5. Derechos del titular</h2>
              <p>
                Puedes solicitar actualización, corrección o eliminación de tus datos a través de
                contacto@mivitrina.com.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}