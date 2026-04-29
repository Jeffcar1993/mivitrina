import { Link } from "react-router-dom";
import LogoImage from "../assets/logotipo.png";
import { Footer } from "../components/Footer";

export default function SellInfo() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFB]">
      <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={LogoImage} alt="MiVitrina Logo" className="h-16 w-auto object-contain md:h-20" />
          </Link>
          <Link to="/como-funciona" className="text-sm font-semibold text-[#9B5F71] hover:underline">
            Volver a ¿Cómo funciona?
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <h1 className="text-3xl font-black text-slate-900">Más información para vender</h1>
          <p className="mt-2 text-sm text-slate-500">Guía rápida para vender mejor en MiVitrina.</p>

          <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
            <section>
              <h2 className="text-base font-bold text-slate-900">1. Crea publicaciones claras</h2>
              <p>Usa títulos concretos, descripciones útiles y especifica el estado del producto.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">2. Sube fotos de calidad</h2>
              <p>Muestra varios ángulos, buena iluminación y detalles clave para generar confianza.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">3. Define un precio competitivo</h2>
              <p>Compara productos similares y ajusta tu precio para vender más rápido.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">4. Responde rápido</h2>
              <p>Atender preguntas a tiempo mejora la conversión y tu reputación como vendedor.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">5. Empaca y envía con cuidado</h2>
              <p>Protege bien el producto y comparte actualizaciones para una mejor experiencia.</p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}