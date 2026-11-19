import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="liquid-glass rounded-2xl p-10 max-w-md w-full shadow-2xl flex flex-col items-center">
        <h1 className="text-6xl font-extrabold text-primary mb-4 drop-shadow-md">404</h1>
        <h2 className="text-xl font-bold text-text-primary mb-2">Página no encontrada</h2>
        <p className="text-text-secondary text-sm mb-8">
          La ruta que intentas buscar no existe o ha sido movida.
        </p>
        <Link 
          href="/dashboard"
          className="bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-primary/25 active:scale-95"
        >
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
