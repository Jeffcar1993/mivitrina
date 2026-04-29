import { Link } from "react-router-dom";
import LogoImage from "../assets/logotipo.png";
import { Footer } from "../components/Footer";

export default function HowItWorks() {
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
          <h1 className="text-3xl font-black text-slate-900">¿Cómo funciona?</h1>

          <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900">¡Únete a la comunidad!</h2>
              <p>MiVitrina es un marketplace para vender y comprar productos de múltiples categorías.</p>
              <p>Desde moda y tecnología hasta hogar, accesorios y más.</p>
              <div className="flex items-center gap-2 pt-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">Vende</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">Compra</span>
              </div>
            </section>

            <section className="space-y-5">
              <h3 className="text-base font-bold text-slate-900">Publica tus productos</h3>
              <p>
                Elige los artículos que quieres vender, agrega fotos claras, una descripción útil
                y define tu precio en minutos.
              </p>

              <h3 className="text-base font-bold text-slate-900">Gestiona tus ventas</h3>
              <p>
                Recibe notificaciones cuando alguien compre, confirma el pedido y prepara el envío
                de forma rápida y organizada.
              </p>

              <h3 className="text-base font-bold text-slate-900">Recibe tus ganancias</h3>
              <p>
                El valor de tus ventas se refleja en tu balance para que lo uses dentro de la
                plataforma o lo retires según las opciones disponibles.
              </p>
              <Link to="/info-vender" className="inline-block font-semibold text-[#9B5F71] hover:underline">
                + Más información para vender
              </Link>
            </section>

            <section className="space-y-5">
              <h3 className="text-base font-bold text-slate-900">Explora por categorías</h3>
              <p>
                Descubre productos nuevos y seminuevos en diferentes categorías,
                con opciones para todos los presupuestos.
              </p>

              <h3 className="text-base font-bold text-slate-900">Compra con pago seguro</h3>
              <p>
                Elige tu método de pago preferido y finaliza tus compras con un proceso claro
                y protegido.
              </p>

              <h3 className="text-base font-bold text-slate-900">Recibe en tu dirección</h3>
              <p>
                Sigue el estado de tu pedido y recibe tus productos donde los necesites.
                Después de la entrega, califica tu experiencia para ayudar a la comunidad.
              </p>
              <Link to="/info-comprar" className="inline-block font-semibold text-[#9B5F71] hover:underline">
                + Más información para comprar
              </Link>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}