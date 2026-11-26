import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  CalendarClock,
  Check,
  Eye,
  EyeOff,
  Pill,
  ShieldCheck,
} from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

type ShiftRole = 'Caja' | 'Sanitario' | 'Admin';

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<ShiftRole>('Caja');
  const [rememberSession, setRememberSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    window.setTimeout(onLogin, 450);
  }

  return (
    <main className="grid h-screen overflow-y-auto overscroll-y-contain bg-white lg:grid-cols-[0.92fr_1.08fr]">
      {/* Columna izquierda: Formulario de acceso */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 sm:px-10 lg:min-h-0 lg:px-12">
        <div className="pointer-events-none absolute -left-32 -top-32 h-72 w-72 rounded-full bg-sky-100 blur-3xl lg:hidden" />

        <motion.div
          className="relative z-10 my-auto w-full max-w-md"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          {/* Encabezado de marca visible en móvil o en la parte superior del formulario */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-sky-200">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold leading-none tracking-tight text-slate-900">
                  Farma<span className="text-blue-600">POS</span>
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  por AprobaSoft
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              ACCESO A LA PLATAFORMA
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-[2.05rem]">
              Bienvenido de nuevo
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Correo electrónico
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="mostrador@farmacia.com"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={
                    showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-[18px] w-[18px]" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5 text-xs">
              <label className="inline-flex cursor-pointer items-center gap-2 text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                />
                Recordar sesión
              </label>
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={isSubmitting ? undefined : { y: -1, scale: 1.01 }}
              whileTap={isSubmitting ? undefined : { scale: 0.99 }}
              className="group mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-500 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-shadow hover:shadow-xl hover:shadow-blue-600/25 disabled:cursor-wait disabled:opacity-80"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isSubmitting ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Abriendo caja...
                  </motion.span>
                ) : (
                  <motion.span
                    key="label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    Entrar a FarmaPOS
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          <div className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3">
            <p className="text-xs leading-5 text-amber-900/80">
              <span className="font-semibold text-amber-950">Modo demostración:</span>{' '}
              ingresa cualquier correo y contraseña para acceder al sistema.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Control sanitario y ventas en mostrador
          </div>
        </motion.div>
      </section>

      {/* Columna derecha: Panel visual oscuro con estilos y animaciones originales */}
      <section className="relative hidden min-h-screen flex-col overflow-x-hidden overflow-y-auto bg-[#071a35] px-12 py-10 text-white lg:flex lg:h-screen lg:min-h-0 xl:px-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_82%_18%,rgba(0,190,220,0.22),transparent_38%),linear-gradient(135deg,#071a35_10%,#0b2d5c_66%,#075b83)]" />
        <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.22)_1px,transparent_1px)] [background-size:54px_54px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />

        <motion.div
          aria-hidden="true"
          className="absolute -right-36 top-28 h-[27rem] w-[27rem] rounded-full border border-cyan-200/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 50, ease: 'linear', repeat: Infinity }}
        >
          <div className="absolute left-10 top-12 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_24px_8px_rgba(34,211,238,.38)]" />
        </motion.div>

        <motion.div
          aria-hidden="true"
          className="absolute -right-20 top-44 h-[21rem] w-[21rem] rounded-full border border-sky-200/10"
          animate={{ rotate: -360 }}
          transition={{ duration: 38, ease: 'linear', repeat: Infinity }}
        >
          <div className="absolute bottom-12 left-10 h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_20px_6px_rgba(96,165,250,.35)]" />
        </motion.div>

        <motion.div
          className="relative z-10 flex items-center gap-3"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-white-500 to-cyan-400 shadow-lg shadow-cyan-950/30">
            <img src="/Logo_SinFondo.png" alt="AprobaSoft" className="h-6 w-6" />
          </div>
          <div className="text-xl font-bold tracking-tight">
            Aproba<span className="text-cyan-300">Soft</span>
          </div>
        </motion.div>

        <div className="relative z-10 my-auto max-w-2xl pb-2 pt-10">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
          >
            <h2 className="max-w-xl text-3xl font-bold leading-[1.08] tracking-tight xl:text-4xl">
              Tu operación de farmacia,
              <span className="mt-2 block bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                ágil y bajo control.
              </span>
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-blue-100/75 xl:text-lg">
              Lotes, caducidades y venta en mostrador en un solo flujo
              pensado para atender rápido sin descuidar el cumplimiento.
            </p>
          </motion.div>

          <motion.div
            className="relative mt-8 max-w-lg"
            initial={{ opacity: 0, y: 28, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.75, delay: 0.3 }}
          >
            <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-5 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-200">
                    <Pill className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Resumen de mostrador y stock
                    </p>
                    <p className="mt-0.5 text-xs text-blue-100/60">
                      Trazabilidad FEFO y control sanitario
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-300/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  En línea
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-slate-950/20 p-4">
                  <div className="flex items-center justify-between text-blue-100/65">
                    <span className="text-xs">Lotes activos</span>
                    <Activity className="h-4 w-4 text-cyan-300" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-white">128</p>
                  <p className="mt-1 text-[11px] text-emerald-200">
                    <span className="mr-1">↗</span> Caducidades revisadas
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-950/20 p-4">
                  <div className="flex items-center justify-between text-blue-100/65">
                    <span className="text-xs">Por vencer (&lt;90d)</span>
                    <CalendarClock className="h-4 w-4 text-sky-300" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-white">06</p>
                  <p className="mt-1 text-[11px] text-blue-100/60">
                    Alertas FEFO activas
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-blue-100/70">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-300/15 text-cyan-200">
                  <Check className="h-3 w-3" />
                </span>
                Mostrador rápido, inventario claro y respaldo AprobaSoft
              </div>
            </div>

            <motion.div
              className="absolute -right-7 -top-6 flex items-center gap-2 rounded-xl border border-white/15 bg-[#102f55]/90 px-3 py-2.5 shadow-xl backdrop-blur-lg"
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity }}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-300/15 text-emerald-200">
                <Check className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-white">
                Listo para cobrar
              </span>
            </motion.div>
          </motion.div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-blue-100/50">
          <span>© 2026 AprobaSoft</span>
          <span>FarmaPOS · Soluciones que aprueban</span>
        </div>
      </section>
    </main>
  );
}