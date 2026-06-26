import { useState } from "react"
import axios from "axios"
import Cookies from "js-cookie"
import NavBar from "../components/NavBar/NavBar"
import {
    Search, User, AlertCircle, ShieldCheck, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle,
} from "lucide-react"

const API_URL = import.meta.env.VITE_API_URL

const ConsultarScore = () => {

    const [cliente, setCliente] = useState("")
    const [data, setData]       = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError]     = useState(null)
    const [consultado, setConsultado] = useState(false)

    const clienteValido = cliente.trim().length > 0

    // ── HELPERS ─────────────────────────────────────────────
    const fmtMoney = (n) =>
        n === null || n === undefined || n === ""
            ? "0.00"
            : Number(n).toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const fmtPct = (n, decimals = 1) =>
        n === null || n === undefined || n === "" ? "—" : `${Number(n).toFixed(decimals)}%`

    const riesgoBadge = (nivel) => {
        const estilos = {
            Bajo:  "bg-emerald-50 text-emerald-700 border-emerald-200",
            Medio: "bg-amber-50 text-amber-700 border-amber-200",
            Alto:  "bg-red-50 text-red-700 border-red-200",
        }
        return estilos[nivel] || "bg-gray-50 text-gray-700 border-gray-200"
    }

    const tendenciaIcon = (tendencia) => {
        if (tendencia === "mejorando") return <TrendingUp size={14} className="text-emerald-600" />
        if (tendencia === "empeorando") return <TrendingDown size={14} className="text-red-600" />
        return <Minus size={14} className="text-gray-400" />
    }

    // ── CONSULTAR ───────────────────────────────────────────
    const handleConsultar = async (e) => {
        e.preventDefault()
        if (!clienteValido) return

        setLoading(true)
        setConsultado(true)
        setError(null)
        setData(null)

        try {
            const token = Cookies.get("access_token")
            const res = await axios.get(`${API_URL}credit-score/`, {
                params: { cliente: cliente.trim() },
                headers: { Authorization: `Bearer ${token}` },
            })
            setData(res.data ?? null)
        } catch (err) {
            console.error("Error al consultar score del cliente:", err)
            setError("No se pudo consultar el score del cliente")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <NavBar />
            <main className="max-w-full mx-auto px-6 py-8">

                {/* ENCABEZADO */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Consultar Score Cliente</h1>
                    <p className="text-sm text-gray-500 mt-1">Consulta el score crediticio individual de un cliente</p>
                </div>

                {/* FORMULARIO */}
                <form onSubmit={handleConsultar} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm w-full">
                    <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="flex flex-col gap-1 flex-1 w-full">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <User size={15} className="text-gray-400" /> Nombre del Cliente <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={cliente}
                                onChange={(e) => setCliente(e.target.value)}
                                placeholder="Ingrese el nombre del cliente"
                                className="border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white w-full h-[38px]"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!clienteValido || loading}
                            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors whitespace-nowrap h-[38px]"
                        >
                            <Search size={16} /> Consultar
                        </button>
                    </div>
                </form>

                {/* ESTADO VACÍO / CARGANDO / ERROR */}
                {(!consultado || loading || error) && (
                    <div className="bg-white border border-dashed border-gray-300 rounded-2xl mt-6 py-20 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <AlertCircle size={28} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {loading ? "Consultando..." : error ? "No se pudo cargar la información" : "Sin datos para mostrar"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {loading
                                ? "Obteniendo el score crediticio del cliente."
                                : error || "Ingrese el nombre de un cliente y haga clic en \"Consultar\" para ver su score."}
                        </p>
                    </div>
                )}

                {/* RESULTADO */}
                {consultado && !loading && !error && data && (
                    <div className="mt-6 space-y-6">

                        {/* TARJETAS RESUMEN */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between text-gray-500 text-sm">
                                    Cupo Actual <ShieldCheck size={16} className="text-gray-400" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900 mt-3">${fmtMoney(data.credit_limit_actual)}</p>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between text-gray-500 text-sm">
                                    Saldo Total <ShieldCheck size={16} className="text-gray-400" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900 mt-3">${fmtMoney(data.saldo_total)}</p>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between text-gray-500 text-sm">
                                    Utilización <ShieldCheck size={16} className="text-gray-400" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900 mt-3">{fmtPct(data.utilizacion_pct)}</p>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between text-gray-500 text-sm">
                                    Score <ShieldCheck size={16} className="text-sky-500" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900 mt-3">{data.score}</p>
                            </div>
                        </div>

                        {/* DETALLE CLIENTE */}
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900">{data.nombre}</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">ID Cliente: {data.partner_id}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className={`text-xs border rounded-full px-2.5 py-1 font-medium ${riesgoBadge(data.nivel_riesgo)}`}>
                                        Riesgo {data.nivel_riesgo}
                                    </span>
                                    <span className={`flex items-center gap-1 text-xs border rounded-full px-2.5 py-1 font-medium ${data.es_candidato ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                                        {data.es_candidato ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                                        {data.es_candidato ? "Candidato a ampliación" : "No candidato"}
                                    </span>
                                </div>
                            </div>

                            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-xs text-gray-400">Deuda Real</p>
                                    <p className="text-sm font-semibold text-gray-800 mt-1">${fmtMoney(data.deuda_real)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Cheques en Custodia</p>
                                    <p className="text-sm font-semibold text-gray-800 mt-1">${fmtMoney(data.cheques_custodia)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Recomendación</p>
                                    <p className="text-sm font-semibold text-gray-800 mt-1">{data.recomendacion}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Mora Promedio</p>
                                    <p className="text-sm font-semibold text-gray-800 mt-1">{data.detalle_score?.mora_promedio_dias} días</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Ratio Deuda Vencida</p>
                                    <p className="text-sm font-semibold text-gray-800 mt-1">{fmtPct((data.detalle_score?.ratio_deuda_vencida ?? 0) * 100)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Tendencia de Pago</p>
                                    <p className="text-sm font-semibold text-gray-800 mt-1 flex items-center gap-1">
                                        {tendenciaIcon(data.detalle_score?.tendencia_pago)} {data.detalle_score?.tendencia_pago}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Frecuencia Notas de Crédito</p>
                                    <p className="text-sm font-semibold text-gray-800 mt-1">{fmtPct((data.detalle_score?.frecuencia_nc_ratio ?? 0) * 100)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Monto Notas de Crédito</p>
                                    <p className="text-sm font-semibold text-gray-800 mt-1">{fmtPct((data.detalle_score?.monto_nc_ratio ?? 0) * 100, 2)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Antigüedad</p>
                                    <p className="text-sm font-semibold text-gray-800 mt-1">{data.detalle_score?.antiguedad_meses} meses</p>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* RESULTADO VACÍO (cliente no encontrado) */}
                {consultado && !loading && !error && !data && (
                    <div className="bg-white border border-dashed border-gray-300 rounded-2xl mt-6 py-20 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <AlertCircle size={28} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Cliente no encontrado</h3>
                        <p className="text-sm text-gray-500 mt-1">No se encontró información de score para "{cliente}"</p>
                    </div>
                )}

            </main>
        </div>
    )
}

export default ConsultarScore
