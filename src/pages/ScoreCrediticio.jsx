import { useState, useEffect } from "react"
import axios from "axios"
import Cookies from "js-cookie"
import NavBar from "../components/NavBar/NavBar"
import {
    Users, ShieldCheck, AlertCircle, TrendingUp, TrendingDown, Minus,
    FileSpreadsheet, FileText,
} from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import logoImg from "../assets/imgLogo.png"

const API_URL = import.meta.env.VITE_API_URL

const ScoreCrediticio = () => {

    const [data, setData]       = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState(null)

    useEffect(() => {
        const fetchCandidatos = async () => {
            try {
                const token = Cookies.get("access_token")
                const res = await axios.get(`${API_URL}credit-candidates/`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setData(res.data ?? null)
            } catch (err) {
                console.error("Error al cargar candidatos de crédito:", err)
                setError("No se pudieron cargar los candidatos a ampliación de cupo")
            } finally {
                setLoading(false)
            }
        }
        fetchCandidatos()
    }, [])

    // ── HELPERS ─────────────────────────────────────────────
    const fmtMoney = (n) =>
        n === null || n === undefined || n === ""
            ? "0.00"
            : Number(n).toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const fmtPct = (n) =>
        n === null || n === undefined || n === "" ? "—" : `${Number(n).toFixed(1)}%`

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

    const candidatos = data?.candidatos ?? []
    const totalCandidatos = data?.total_candidatos ?? candidatos.length
    const scorePromedio = candidatos.length
        ? candidatos.reduce((acc, c) => acc + (c.score ?? 0), 0) / candidatos.length
        : 0

    // ── EXPORT EXCEL ────────────────────────────────────────
    const handleExportExcel = () => {
        if (candidatos.length === 0) { alert("No hay datos para exportar"); return }

        const wb = XLSX.utils.book_new()

        const filaColumnas = [
            "Cliente", "Cupo Actual", "Saldo Total", "Deuda Real", "Utilización (%)",
            "Score", "Riesgo", "Mora Promedio (días)", "Tendencia", "Recomendación",
        ]

        const filasCandidatos = candidatos.map((c) => [
            c.nombre,
            c.credit_limit_actual ?? 0,
            c.saldo_total ?? 0,
            c.deuda_real ?? 0,
            c.utilizacion_pct ?? 0,
            c.score ?? 0,
            c.nivel_riesgo,
            c.detalle_score?.mora_promedio_dias ?? 0,
            c.detalle_score?.tendencia_pago,
            c.recomendacion,
        ])

        const ws = XLSX.utils.aoa_to_sheet([
            ["Score Crediticio - Candidatos a Ampliación de Cupo"],
            [`Total candidatos: ${totalCandidatos}`],
            [],
            filaColumnas,
            ...filasCandidatos,
        ])

        ws["!merges"] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: filaColumnas.length - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: filaColumnas.length - 1 } },
        ]

        ws["!cols"] = [
            { wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
            { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 28 },
        ]

        XLSX.utils.book_append_sheet(wb, ws, "Score Crediticio")

        const fechaExport = new Date().toISOString().slice(0, 10)
        XLSX.writeFile(wb, `Score_Crediticio_${fechaExport}.xlsx`)
    }

    // ── EXPORT PDF ──────────────────────────────────────────
    const handleExportPDF = () => {
        if (candidatos.length === 0) { alert("No hay datos para exportar"); return }

        const doc       = new jsPDF({ orientation: "landscape" })
        const pageWidth = doc.internal.pageSize.getWidth()

        // Encabezado tipo Estado de Cuenta
        doc.addImage(logoImg, "PNG", 14, 10, 50, 15)
        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.text("IMPOR EXPORT AROMOTOR CIA. LTDA.", 70, 15)
        doc.setFont("helvetica", "normal")
        doc.text("CALLE CAMINO A LA BENGALA Y AV LOS COLONOS", 70, 21)
        doc.text("Ecuador", 70, 27)
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.1)
        doc.line(14, 32, pageWidth - 14, 32)

        const fechaGeneracion = new Date().toLocaleString("es-EC", { dateStyle: "short", timeStyle: "medium" })

        doc.setFontSize(9)
        doc.setTextColor(120)
        doc.text("Candidatos:", 14, 39)
        doc.setTextColor(0)
        doc.text(String(totalCandidatos), 38, 39)

        doc.setTextColor(120)
        doc.text(`Generado: ${fechaGeneracion}`, pageWidth - 14, 39, { align: "right" })
        doc.setTextColor(0)

        doc.setFontSize(13)
        doc.setFont("helvetica", "bold")
        doc.text("Score Crediticio - Candidatos a Ampliación de Cupo", 14, 47)
        doc.setFont("helvetica", "normal")

        autoTable(doc, {
            startY: 53,
            head: [["Cliente", "Cupo", "Saldo", "Deuda Real", "Util.", "Score", "Riesgo", "Mora", "Tendencia", "Recomendación"]],
            body: candidatos.map((c) => [
                c.nombre,
                fmtMoney(c.credit_limit_actual),
                fmtMoney(c.saldo_total),
                fmtMoney(c.deuda_real),
                fmtPct(c.utilizacion_pct),
                c.score,
                c.nivel_riesgo,
                `${c.detalle_score?.mora_promedio_dias} días`,
                c.detalle_score?.tendencia_pago,
                c.recomendacion,
            ]),
            styles: { fontSize: 7, halign: "left" },
            headStyles: { fillColor: [250, 0, 0], textColor: 255, fontStyle: "bold", halign: "left" },
        })

        const fechaExport = new Date().toISOString().slice(0, 10)
        doc.save(`Score_Crediticio_${fechaExport}.pdf`)
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <NavBar />
            <main className="max-w-full mx-auto px-6 py-8">

                {/* ENCABEZADO */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Score Crediticio</h1>
                    <p className="text-sm text-gray-500 mt-1">Clientes con opción a aplicación de cupo</p>
                </div>

                {/* ESTADO CARGANDO / ERROR */}
                {(loading || error) && (
                    <div className="bg-white border border-dashed border-gray-300 rounded-2xl py-20 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <AlertCircle size={28} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {loading ? "Consultando..." : "No se pudo cargar la información"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {loading ? "Obteniendo los candidatos a ampliación de cupo." : error}
                        </p>
                    </div>
                )}

                {/* RESULTADOS */}
                {!loading && !error && (
                    <div className="space-y-6">

                        {/* TARJETAS RESUMEN */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between text-gray-500 text-sm">
                                    Candidatos <Users size={16} className="text-gray-400" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900 mt-3">{totalCandidatos}</p>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between text-gray-500 text-sm">
                                    Score Promedio <ShieldCheck size={16} className="text-rose-500" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900 mt-3">{scorePromedio.toFixed(1)}</p>
                            </div>
                        </div>

                        {/* TABLA DE CANDIDATOS */}
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="text-base font-semibold text-gray-900">
                                    Candidatos a Ampliación de Cupo
                                    <span className="ml-1 text-sm font-normal text-gray-400">
                                        ({candidatos.length} cliente{candidatos.length !== 1 ? "s" : ""})
                                    </span>
                                </h3>

                                <div className="flex items-center gap-2">
                                    <button onClick={handleExportExcel}
                                        className="flex items-center gap-2 border border-green-600 text-green-700 hover:bg-green-50 font-medium px-4 py-1.5 rounded-lg text-sm transition-colors">
                                        <FileSpreadsheet size={15} /> Excel
                                    </button>
                                    <button onClick={handleExportPDF}
                                        className="flex items-center gap-2 border border-red-600 text-red-700 hover:bg-red-50 font-medium px-4 py-1.5 rounded-lg text-sm transition-colors">
                                        <FileText size={15} /> PDF
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                                            <th className="px-4 py-3 font-medium">Cliente</th>
                                            <th className="px-4 py-3 font-medium text-right">Cupo Actual</th>
                                            <th className="px-4 py-3 font-medium text-right">Saldo Total</th>
                                            <th className="px-4 py-3 font-medium text-right">Deuda Real</th>
                                            <th className="px-4 py-3 font-medium text-right">Utilización</th>
                                            <th className="px-4 py-3 font-medium text-right">Score</th>
                                            <th className="px-4 py-3 font-medium">Riesgo</th>
                                            <th className="px-4 py-3 font-medium">Mora Prom.</th>
                                            <th className="px-4 py-3 font-medium">Tendencia</th>
                                            <th className="px-4 py-3 font-medium">Recomendación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {candidatos.length > 0 ? candidatos.map((c) => (
                                            <tr key={c.partner_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-800 font-medium">{c.nombre}</td>
                                                <td className="px-4 py-3 text-right text-gray-600">${fmtMoney(c.credit_limit_actual)}</td>
                                                <td className="px-4 py-3 text-right text-gray-600">${fmtMoney(c.saldo_total)}</td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-800">${fmtMoney(c.deuda_real)}</td>
                                                <td className="px-4 py-3 text-right text-gray-600">{fmtPct(c.utilizacion_pct)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900">{c.score}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${riesgoBadge(c.nivel_riesgo)}`}>
                                                        {c.nivel_riesgo}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{c.detalle_score?.mora_promedio_dias} días</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 text-gray-600">
                                                        {tendenciaIcon(c.detalle_score?.tendencia_pago)}
                                                        {c.detalle_score?.tendencia_pago}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{c.recomendacion}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                                                    No hay candidatos a ampliación de cupo
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )}

            </main>
        </div>
    )
}

export default ScoreCrediticio
