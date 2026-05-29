import { useState, useEffect } from "react"
import axios from "axios"
import Cookies from "js-cookie"
import NavBar from "../components/NavBar/NavBar"
import {
    Search, Package, Calendar, MapPin, Minus,
    TrendingUp, TrendingDown, Box, AlertCircle,
    FileSpreadsheet, FileText,
} from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const API_URL = import.meta.env.VITE_API_URL

const Kardex = () => {

    // ── STATES ──────────────────────────────────────────────
    const [productos, setProductos]                         = useState([])
    const [productoSeleccionado, setProductoSeleccionado]   = useState(null)
    const [busqueda, setBusqueda]                           = useState("")
    const [mostrarDropdown, setMostrarDropdown]             = useState(false)
    const [loadingProductos, setLoadingProductos]           = useState(true)

    const [fechaInicio, setFechaInicio] = useState("")
    const [fechaFin, setFechaFin] = useState(new Date().toISOString().slice(0, 10))

    const [ubicaciones, setUbicaciones]                             = useState([])
    const [ubicacionesSeleccionadas, setUbicacionesSeleccionadas]   = useState([])
    const [busquedaUbicacion, setBusquedaUbicacion]                 = useState("")
    const [mostrarDropdownUbicacion, setMostrarDropdownUbicacion]   = useState(false)
    const [loadingUbicaciones, setLoadingUbicaciones]               = useState(true)

    const [data, setData]                         = useState(null)
    const [loadingMovimientos, setLoadingMovimientos] = useState(false)
    const [consultado, setConsultado]             = useState(false)

    // ── CARGAR PRODUCTOS ────────────────────────────────────
    useEffect(() => {
        const fetchProductos = async () => {
            try {
                const token = Cookies.get("access_token")
                const res = await axios.get(`${API_URL}get-productos/`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setProductos(Array.isArray(res.data) ? res.data : [])
            } catch (err) {
                console.error("Error al cargar productos:", err)
            } finally {
                setLoadingProductos(false)
            }
        }
        fetchProductos()
    }, [])

    // ── CARGAR UBICACIONES ──────────────────────────────────
    useEffect(() => {
        const fetchUbicaciones = async () => {
            try {
                const token = Cookies.get("access_token")
                const res = await axios.get(`${API_URL}get-ubicaciones/`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setUbicaciones(Array.isArray(res.data) ? res.data : [])
            } catch (err) {
                console.error("Error al cargar ubicaciones:", err)
            } finally {
                setLoadingUbicaciones(false)
            }
        }
        fetchUbicaciones()
    }, [])

    // ── FILTROS DROPDOWN ────────────────────────────────────
    const productosFiltrados = productos.filter((p) =>
        String(p.default_code ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
        String(p.name ?? "").toLowerCase().includes(busqueda.toLowerCase())
    )

    const ubicacionesFiltradas = ubicaciones.filter((u) => {
        const yaSeleccionada = ubicacionesSeleccionadas.some((item) => item.id === u.id)
        if (yaSeleccionada) return false
        return (
            String(u.name ?? "").toLowerCase().includes(busquedaUbicacion.toLowerCase()) ||
            String(u.complete_name ?? "").toLowerCase().includes(busquedaUbicacion.toLowerCase())
        )
    })

    // ── HANDLERS ────────────────────────────────────────────
    const handleSeleccionarProducto = (producto) => {
        setProductoSeleccionado(producto)
        setBusqueda("")
        setMostrarDropdown(false)
    }

    const handleQuitarProducto = () => {
        setProductoSeleccionado(null)
        setBusqueda("")
        setMostrarDropdown(false)
        setData(null)
        setConsultado(false)
    }

    const handleSeleccionarUbicacion = (ubicacion) => {
        setUbicacionesSeleccionadas((prev) => [...prev, ubicacion])
        setBusquedaUbicacion("")
    }

    const handleQuitarUbicacion = (id) => {
        setUbicacionesSeleccionadas((prev) => prev.filter((u) => u.id !== id))
    }

    // ── CONSULTAR ───────────────────────────────────────────
    const handleConsultar = async () => {
        if (!productoSeleccionado) { alert("Debe seleccionar un producto"); return }
        if (!fechaFin)             { alert("La fecha fin es requerida");     return }

        setLoadingMovimientos(true)
        setConsultado(true)

        try {
            const token = Cookies.get("access_token")
            const res = await axios.post(
                `${API_URL}kardex/`,
                {
                    productos:    [productoSeleccionado.id],
                    ubicaciones:  ubicacionesSeleccionadas.map((u) => u.id),
                    fecha_inicio: fechaInicio || null,
                    fecha_fin:    fechaFin,
                },
                { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
            )
            setData(res.data ?? null)
        } catch (err) {
            console.error("Error al consultar kardex:", err)
            setData(null)
        } finally {
            setLoadingMovimientos(false)
        }
    }

    // ── HELPERS ─────────────────────────────────────────────
    const fmt = (n) =>
        n === null || n === undefined || n === ""
            ? "—"
            : Number(n).toLocaleString("es-EC")

    const grupos = data?.datos ?? []
    const todosLosMovimientos = grupos.flatMap((g) => g.movimientos ?? [])

    // Total Ingresos = todo lo que entró
    const total_ingresos = todosLosMovimientos.reduce((acc, m) => acc + (m.ingreso_cantidad ?? 0), 0)
    const valor_ingresos = todosLosMovimientos.reduce((acc, m) => acc + (m.ingreso_valor ?? 0), 0)

    // Total Comprado = origen es Vendors
    const total_comprado = todosLosMovimientos
        .filter((m) => String(m.ubicacion_origen ?? "").toLowerCase().includes("vendor"))
        .reduce((acc, m) => acc + (m.ingreso_cantidad ?? 0), 0)
    const valor_comprado = todosLosMovimientos
        .filter((m) => String(m.ubicacion_origen ?? "").toLowerCase().includes("vendor"))
        .reduce((acc, m) => acc + (m.ingreso_valor ?? 0), 0)

    // Total Egresos = todo lo que salió
    const total_egresos = todosLosMovimientos.reduce((acc, m) => acc + (m.egreso_cantidad ?? 0), 0)
    const valor_egresos = todosLosMovimientos.reduce((acc, m) => acc + (m.egreso_valor ?? 0), 0)

    // Total Vendido = destino es Customers
    const total_vendido = todosLosMovimientos
        .filter((m) => String(m.ubicacion_destino ?? "").toLowerCase().includes("customer"))
        .reduce((acc, m) => acc + (m.egreso_cantidad ?? 0), 0)
    const valor_vendido = todosLosMovimientos
        .filter((m) => String(m.ubicacion_destino ?? "").toLowerCase().includes("customer"))
        .reduce((acc, m) => acc + (m.egreso_valor ?? 0), 0)

    const saldo_inicial_total = grupos.reduce((acc, g) => acc + (g.saldo_inicial ?? 0), 0)
    const saldo_final_total   = grupos.reduce((acc, g) => {
        const movs = g.movimientos ?? []
        const ultimo = movs.at(-1)?.saldo_total_inventario ?? g.saldo_inicial ?? 0
        return acc + ultimo
    }, 0)

    // ── EXPORT EXCEL ────────────────────────────────────────
    const handleExportExcel = () => {
        if (!data || grupos.length === 0) { alert("No hay datos para exportar"); return }

        const wb = XLSX.utils.book_new()
        const nombreProducto = productoSeleccionado
            ? `${productoSeleccionado.default_code} - ${productoSeleccionado.name}`
            : "Producto"

        grupos.forEach((g) => {
            const movs = g.movimientos ?? []

            const headerMeta = ["", "", "", "", "", "", "INGRESO", "EGRESO", "", "", "SALDO"]
            const headerCols = [
                "Fecha movimiento", "Ubicación origen", "Ubicación destino",
                "No. de movimiento", "No. de documento", "",
                "Cantidad", "Cantidad", "Costo", "Valor", "Total inventario",
            ]

            const filasSaldoInicial = [[
                "SALDO INICIAL", "", "", "", "", "",
                "", "", "", "", g.saldo_inicial ?? 0,
            ]]

            const filasMovimientos = movs.map((m) => {
                const esIngreso = (m.ingreso_cantidad ?? 0) > 0
                return [
                    m.fecha,
                    m.ubicacion_origen,
                    m.ubicacion_destino,
                    m.no_movimiento,
                    m.no_documento ?? "",
                    "",
                    esIngreso ? (m.ingreso_cantidad ?? 0) : 0,
                    !esIngreso ? (m.egreso_cantidad ?? 0) : 0,
                    esIngreso ? (m.ingreso_costo ?? 0) : (m.egreso_costo ?? 0),
                    esIngreso ? (m.ingreso_valor ?? 0) : (m.egreso_valor ?? 0),
                    m.saldo_total_inventario ?? "",
                ]
            })

            const filas = [
                [nombreProducto],
                [`Ubicación: ${g.ubicacion}`],
                [],
                headerMeta,
                headerCols,
                ...filasSaldoInicial,
                ...filasMovimientos,
            ]

            const ws = XLSX.utils.aoa_to_sheet(filas)
            ws["!cols"] = [
                { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 20 },
                { wch: 26 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 16 },
            ]

            const nombreHoja = (g.ubicacion || "Ubicacion")
                .replace(/[\\/?*[\]:]/g, "_")
                .substring(0, 31)

            XLSX.utils.book_append_sheet(wb, ws, nombreHoja)
        })

        if (wb.SheetNames.length === 0) { alert("No se encontraron movimientos para exportar"); return }

        const fechaExport = new Date().toISOString().slice(0, 10)
        XLSX.writeFile(wb, `Kardex_${productoSeleccionado?.default_code ?? "Producto"}_${fechaExport}.xlsx`)
    }

    // ── EXPORT PDF ──────────────────────────────────────────
    const handleExportPDF = () => {
        if (!data || grupos.length === 0) { alert("No hay datos para exportar"); return }

        const doc = new jsPDF({ orientation: "landscape" })
        const nombreProducto = productoSeleccionado
            ? `${productoSeleccionado.default_code} - ${productoSeleccionado.name}`
            : "Producto"

        grupos.forEach((g, idx) => {
            if (idx > 0) doc.addPage()

            doc.setFontSize(13)
            doc.text(`Kardex - ${nombreProducto}`, 14, 14)
            doc.setFontSize(10)
            doc.text(`Ubicación: ${g.ubicacion}`, 14, 21)
            doc.text(`Fecha: ${data.fecha_inicio || "—"} → ${data.fecha_fin}`, 14, 27)

            const bodyRows = [
                [
                    { content: "Saldo Inicial", colSpan: 7, styles: { fontStyle: "bold", fillColor: [245, 245, 245] } },
                    { content: fmt(g.saldo_inicial), styles: { halign: "right", fontStyle: "bold", fillColor: [245, 245, 245] } },
                ],
                ...(g.movimientos ?? []).map((m) => {
                    const esIngreso = (m.ingreso_cantidad ?? 0) > 0
                    return [
                        m.fecha,
                        m.no_movimiento,
                        `${m.ubicacion_origen} → ${m.ubicacion_destino}`,
                        esIngreso ? `+${fmt(m.ingreso_cantidad)}` : "—",
                        !esIngreso ? `-${fmt(m.egreso_cantidad)}` : "—",
                        fmt(esIngreso ? m.ingreso_costo : m.egreso_costo),
                        fmt(esIngreso ? m.ingreso_valor : m.egreso_valor),
                        fmt(m.saldo_total_inventario),
                    ]
                }),
            ]

            autoTable(doc, {
                startY: 32,
                head: [["Fecha", "Movimiento", "Origen → Destino", "Ingreso", "Egreso", "Costo", "Valor", "Saldo"]],
                body: bodyRows,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [220, 38, 38] },
                columnStyles: {
                    3: { halign: "right", textColor: [22, 163, 74] },
                    4: { halign: "right", textColor: [220, 38, 38] },
                    5: { halign: "right" },
                    6: { halign: "right" },
                    7: { halign: "right", fontStyle: "bold" },
                },
            })
        })

        const fechaExport = new Date().toISOString().slice(0, 10)
        doc.save(`Kardex_${productoSeleccionado?.default_code ?? "Producto"}_${fechaExport}.pdf`)
    }

    // ── RENDER ──────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-100">
            <NavBar />
            <main className="max-w-full mx-auto px-6 py-8">

                {/* ENCABEZADO */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Kardex de Inventario</h1>
                    <p className="text-sm text-gray-500 mt-1">Consulta de movimientos y saldos de productos</p>
                </div>

                {/* FILTROS */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm w-full">
                    <div className="flex flex-col lg:flex-row items-end gap-4">

                        {/* PRODUCTO */}
                        <div className="flex flex-col gap-1 flex-[2] w-full">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <Package size={15} className="text-gray-400" />
                                Producto <span className="text-red-500">*</span>
                            </label>
                            {productoSeleccionado ? (
                                <div className="border border-gray-300 rounded-lg px-3 bg-white flex items-center h-[38px] overflow-hidden">
                                    <span className="flex items-center gap-1 bg-gray-100 border border-gray-300 text-gray-700 text-sm rounded px-2 py-0.5 max-w-full overflow-hidden">
                                        <span className="font-semibold whitespace-nowrap">{productoSeleccionado.default_code}</span>
                                        <span className="text-gray-500 ml-1 truncate max-w-[200px]">{productoSeleccionado.name}</span>
                                        <button type="button" onClick={handleQuitarProducto}
                                            className="ml-2 text-gray-400 hover:text-red-500 font-bold leading-none text-base flex-shrink-0">×</button>
                                    </span>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input type="text" value={busqueda}
                                        onChange={(e) => { setBusqueda(e.target.value); setMostrarDropdown(true) }}
                                        onFocus={() => setMostrarDropdown(true)}
                                        onBlur={() => setTimeout(() => setMostrarDropdown(false), 150)}
                                        placeholder={loadingProductos ? "Cargando productos..." : "Buscar por código o nombre..."}
                                        disabled={loadingProductos}
                                        className="border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white w-full h-[38px]"
                                    />
                                    {mostrarDropdown && busqueda && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                                            {productosFiltrados.length > 0 ? productosFiltrados.map((p) => (
                                                <div key={p.id}
                                                    onMouseDown={(e) => { e.preventDefault(); handleSeleccionarProducto(p) }}
                                                    className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                                    <span className="font-semibold text-gray-800">{p.default_code}</span>
                                                    <span className="text-gray-500 ml-2">{p.name}</span>
                                                </div>
                                            )) : (
                                                <div className="px-4 py-3 text-sm text-gray-400">No se encontraron productos</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* FECHA INICIO */}
                        <div className="flex flex-col gap-1 flex-1 w-full">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <Calendar size={15} className="text-gray-400" /> Fecha Inicio
                            </label>
                            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                                className="border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white w-full h-[38px]" />
                        </div>

                        {/* FECHA FIN */}
                        <div className="flex flex-col gap-1 flex-1 w-full">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <Calendar size={15} className="text-gray-400" /> Fecha Fin <span className="text-red-500">*</span>
                            </label>
                            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
                                className="border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white w-full h-[38px]" />
                        </div>

                        {/* UBICACIONES */}
                        <div className="flex flex-col gap-1 flex-[2] w-full">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <MapPin size={15} className="text-gray-400" /> Ubicaciones
                            </label>
                            <div className="relative">
                                <div className="border border-gray-300 rounded-lg px-2 py-1 bg-white min-h-[38px] flex flex-wrap gap-1 items-center">
                                    {ubicacionesSeleccionadas.map((u) => (
                                        <span key={u.id} className="flex items-center gap-1 bg-gray-100 border border-gray-300 text-gray-700 text-xs rounded px-2 py-1">
                                            {u.complete_name}
                                            <button type="button" onClick={() => handleQuitarUbicacion(u.id)}
                                                className="text-gray-400 hover:text-red-500 font-bold">×</button>
                                        </span>
                                    ))}
                                    <input type="text" value={busquedaUbicacion}
                                        onChange={(e) => { setBusquedaUbicacion(e.target.value); setMostrarDropdownUbicacion(true) }}
                                        onFocus={() => setMostrarDropdownUbicacion(true)}
                                        onBlur={() => setTimeout(() => setMostrarDropdownUbicacion(false), 150)}
                                        placeholder={ubicacionesSeleccionadas.length === 0 ? (loadingUbicaciones ? "Cargando..." : "Todas las ubicaciones") : ""}
                                        className="flex-1 outline-none text-sm min-w-[120px] bg-transparent"
                                    />
                                </div>
                                {mostrarDropdownUbicacion && busquedaUbicacion && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                                        {ubicacionesFiltradas.length > 0 ? ubicacionesFiltradas.map((u) => (
                                            <div key={u.id}
                                                onMouseDown={(e) => { e.preventDefault(); handleSeleccionarUbicacion(u) }}
                                                className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                                <span className="font-semibold text-gray-800">{u.name}</span>
                                                <span className="text-gray-500 ml-2">{u.complete_name}</span>
                                            </div>
                                        )) : (
                                            <div className="px-4 py-3 text-sm text-gray-400">No se encontraron ubicaciones</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* BOTÓN CONSULTAR */}
                        <div className="flex flex-col justify-end">
                            <button onClick={handleConsultar}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors whitespace-nowrap h-[38px]">
                                <Search size={16} /> Consultar
                            </button>
                        </div>

                    </div>
                </div>

                {/* ESTADO VACÍO / CARGANDO */}
                {(!consultado || loadingMovimientos || !data) && (
                    <div className="bg-white border border-dashed border-gray-300 rounded-2xl mt-6 py-20 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <AlertCircle size={28} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {loadingMovimientos ? "Consultando..." : "Sin datos para mostrar"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {loadingMovimientos
                                ? "Obteniendo los movimientos del producto."
                                : 'Seleccione un producto y haga clic en "Consultar" para ver los movimientos.'}
                        </p>
                    </div>
                )}

                {/* RESULTADOS */}
                {consultado && !loadingMovimientos && data && (
                    <div className="mt-6 space-y-6">

                        {/* INFO PRODUCTO */}
                        {productoSeleccionado && (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                                    <Box size={20} className="text-red-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 leading-tight">{productoSeleccionado.name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs border border-gray-300 rounded px-2 py-0.5 text-gray-600">
                                            {productoSeleccionado.default_code}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {grupos.length} ubicación{grupos.length !== 1 ? "es" : ""}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TARJETAS RESUMEN */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                            {/* Saldo Inicial */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between text-gray-500 text-sm">
                                    Saldo Inicial <Minus size={16} />
                                </div>
                                <p className="text-3xl font-bold text-gray-900 mt-3">{fmt(saldo_inicial_total)}</p>
                            </div>

                            {/* Ingresos */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between text-gray-500 text-sm mb-3">
                                    Ingresos <TrendingUp size={16} className="text-green-600" />
                                </div>
                                <div className="flex items-stretch">
                                    <div className="flex-1 pr-4">
                                        <p className="text-xs text-gray-400 mb-1">Total Ingresos</p>
                                        <p className="text-2xl font-bold text-green-600">+{fmt(total_ingresos)}</p>
                                        <p className="text-xs text-gray-500 mt-1">${fmt(valor_ingresos)}</p>
                                    </div>
                                    <div className="w-px bg-gray-200 mx-2" />
                                    <div className="flex-1 pl-4">
                                        <p className="text-xs text-gray-400 mb-1">Total Comprado</p>
                                        <p className="text-2xl font-bold text-green-600">+{fmt(total_comprado)}</p>
                                        <p className="text-xs text-gray-500 mt-1">${fmt(valor_comprado)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Egresos */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between text-gray-500 text-sm mb-3">
                                    Egresos <TrendingDown size={16} className="text-red-600" />
                                </div>
                                <div className="flex items-stretch">
                                    <div className="flex-1 pr-4">
                                        <p className="text-xs text-gray-400 mb-1">Total Egresos</p>
                                        <p className="text-2xl font-bold text-red-600">-{fmt(total_egresos)}</p>
                                        <p className="text-xs text-gray-500 mt-1">${fmt(valor_egresos)}</p>
                                    </div>
                                    <div className="w-px bg-gray-200 mx-2" />
                                    <div className="flex-1 pl-4">
                                        <p className="text-xs text-gray-400 mb-1">Total Vendido</p>
                                        <p className="text-2xl font-bold text-red-600">-{fmt(total_vendido)}</p>
                                        <p className="text-xs text-gray-500 mt-1">${fmt(valor_vendido)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Saldo Final */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between text-gray-500 text-sm">
                                    Saldo Final <Box size={16} className="text-gray-400" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900 mt-3">{fmt(saldo_final_total)}</p>
                            </div>

                        </div>

                        {/* TABLA POR GRUPO (UNA POR UBICACIÓN) */}
                        {grupos.map((grupo, gi) => {
                            const movs = grupo.movimientos ?? []
                            const saldo_final_grupo = movs.at(-1)?.saldo_total_inventario ?? grupo.saldo_inicial ?? 0

                            return (
                                <div key={gi} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

                                    {/* Header tabla */}
                                    <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                                <MapPin size={15} className="text-gray-400" />
                                                {grupo.ubicacion}
                                                <span className="ml-1 text-sm font-normal text-gray-400">
                                                    ({movs.length} registros)
                                                </span>
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                Saldo inicial: <span className="font-semibold text-gray-700">{fmt(grupo.saldo_inicial)}</span>
                                                <span className="mx-2">·</span>
                                                Saldo final: <span className="font-semibold text-gray-700">{fmt(saldo_final_grupo)}</span>
                                            </p>
                                        </div>

                                        {/* Botones solo en la primera tabla */}
                                        {gi === 0 && (
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
                                        )}
                                    </div>

                                    {/* Tabla */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                                                    <th className="px-4 py-3 font-medium">Fecha</th>
                                                    <th className="px-4 py-3 font-medium">Movimiento</th>
                                                    <th className="px-4 py-3 font-medium">Origen → Destino</th>
                                                    <th className="px-4 py-3 font-medium text-right text-green-600">Ingreso</th>
                                                    <th className="px-4 py-3 font-medium text-right text-red-600">Egreso</th>
                                                    <th className="px-4 py-3 font-medium text-right">Costo</th>
                                                    <th className="px-4 py-3 font-medium text-right">Valor</th>
                                                    <th className="px-4 py-3 font-medium text-right text-gray-900">Saldo</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Saldo inicial */}
                                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                                    <td className="px-4 py-3 font-semibold text-gray-600" colSpan={7}>
                                                        Saldo Inicial
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                        {fmt(grupo.saldo_inicial)}
                                                    </td>
                                                </tr>

                                                {movs.length > 0 ? movs.map((m, index) => {
                                                    const esIngreso = (m.ingreso_cantidad ?? 0) > 0
                                                    return (
                                                        <tr key={index} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{m.fecha}</td>
                                                            <td className="px-4 py-3">
                                                                <span className="flex items-center gap-2">
                                                                    {esIngreso
                                                                        ? <TrendingUp size={14} className="text-green-600" />
                                                                        : <TrendingDown size={14} className="text-red-600" />}
                                                                    <span className="text-xs border border-gray-300 rounded px-2 py-0.5 text-gray-700 font-mono">
                                                                        {m.no_movimiento}
                                                                    </span>
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                                                <span className="text-gray-500">{m.ubicacion_origen}</span>
                                                                <span className="mx-2 text-gray-400">→</span>
                                                                <span className="font-medium text-gray-800">{m.ubicacion_destino}</span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-green-600 font-medium">
                                                                {esIngreso ? `+${fmt(m.ingreso_cantidad)}` : "—"}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-red-600 font-medium">
                                                                {!esIngreso ? `-${fmt(m.egreso_cantidad)}` : "—"}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-gray-500">
                                                                {fmt(esIngreso ? m.ingreso_costo : m.egreso_costo)}
                                                            </td>
                                                            <td className={`px-4 py-3 text-right font-medium ${esIngreso ? "text-green-600" : "text-red-600"}`}>
                                                                {fmt(esIngreso ? m.ingreso_valor : m.egreso_valor)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                                {fmt(m.saldo_total_inventario)}
                                                            </td>
                                                        </tr>
                                                    )
                                                }) : (
                                                    <tr>
                                                        <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                                                            No se encontraron movimientos para esta ubicación
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        })}

                    </div>
                )}

            </main>
        </div>
    )
}

export default Kardex