import { Link } from "react-router-dom";
import LogoImage from "../assets/logotipo.png";
import { Footer } from "../components/Footer";

export default function BuyInfo() {
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
          <h1 className="text-3xl font-black text-slate-900">Más información para comprar</h1>
          <p className="mt-2 text-sm text-slate-500">Consejos para comprar con seguridad en MiVitrina.</p>

          <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
            <section>
              <h2 className="text-base font-bold text-slate-900">1. Revisa la publicación completa</h2>
              <p>Lee descripción, estado, categoría y características antes de finalizar la compra.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">2. Verifica fotos y detalles</h2>
              <p>Comprueba medidas, compatibilidad y cualquier condición importante del producto.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">3. Usa métodos de pago seguros</h2>
              <p>Completa tu pedido con los métodos disponibles dentro de la plataforma.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">4. Haz seguimiento del pedido</h2>
              <p>Consulta el estado de la compra hasta que llegue a tu dirección.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900">5. Califica tu experiencia</h2>
              <p>Tu valoración ayuda a mejorar la calidad de la comunidad y futuras compras.</p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}