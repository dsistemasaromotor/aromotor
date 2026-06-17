import { useState, useEffect } from "react"
import axios from "axios"
import Cookies from "js-cookie"
import NavBar from "../components/NavBar/NavBar"
import {
    Search, Package, Calendar, MapPin, Tag, EyeOff,
    Layers, Box, DollarSign, TrendingUp, AlertCircle,
    FileSpreadsheet, FileText,
} from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import logoImg from "../assets/imgLogo.png"

const API_URL = import.meta.env.VITE_API_URL

const RepValoracionUbicacion = () => {

    // ── STATES ──────────────────────────────────────────────
    const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().slice(0, 10))

    const [productos, setProductos]                         = useState([])
    const [productosSeleccionados, setProductosSeleccionados] = useState([])
    const [busquedaProducto, setBusquedaProducto]           = useState("")
    const [mostrarDropdownProducto, setMostrarDropdownProducto] = useState(false)
    const [loadingProductos, setLoadingProductos]           = useState(true)

    const [ubicaciones, setUbicaciones]                             = useState([])
    const [ubicacionesSeleccionadas, setUbicacionesSeleccionadas]   = useState([])
    const [busquedaUbicacion, setBusquedaUbicacion]                 = useState("")
    const [mostrarDropdownUbicacion, setMostrarDropdownUbicacion]   = useState(false)
    const [loadingUbicaciones, setLoadingUbicaciones]               = useState(true)

    const [categorias, setCategorias]                             = useState([])
    const [categoriasSeleccionadas, setCategoriasSeleccionadas]   = useState([])
    const [busquedaCategoria, setBusquedaCategoria]               = useState("")
    const [mostrarDropdownCategoria, setMostrarDropdownCategoria] = useState(false)
    const [loadingCategorias, setLoadingCategorias]               = useState(true)

    const [excluirStockCero, setExcluirStockCero] = useState(false)

    const [data, setData]               = useState(null)
    const [loadingDatos, setLoadingDatos] = useState(false)
    const [consultado, setConsultado]   = useState(false)

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

    // ── CARGAR CATEGORÍAS ───────────────────────────────────
    useEffect(() => {
        const fetchCategorias = async () => {
            try {
                const token = Cookies.get("access_token")
                const res = await axios.get(`${API_URL}get-categorias/`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setCategorias(Array.isArray(res.data) ? res.data : [])
            } catch (err) {
                console.error("Error al cargar categorías:", err)
            } finally {
                setLoadingCategorias(false)
            }
        }
        fetchCategorias()
    }, [])

    // ── FILTROS DROPDOWN ────────────────────────────────────
    const productosFiltrados = productos.filter((p) => {
        const yaSeleccionado = productosSeleccionados.some((item) => item.id === p.id)
        if (yaSeleccionado) return false
        return (
            String(p.default_code ?? "").toLowerCase().includes(busquedaProducto.toLowerCase()) ||
            String(p.name ?? "").toLowerCase().includes(busquedaProducto.toLowerCase())
        )
    })

    const ubicacionesFiltradas = ubicaciones.filter((u) => {
        const yaSeleccionada = ubicacionesSeleccionadas.some((item) => item.id === u.id)
        if (yaSeleccionada) return false
        return (
            String(u.name ?? "").toLowerCase().includes(busquedaUbicacion.toLowerCase()) ||
            String(u.complete_name ?? "").toLowerCase().includes(busquedaUbicacion.toLowerCase())
        )
    })

    const categoriasFiltradas = categorias.filter((c) => {
        const yaSeleccionada = categoriasSeleccionadas.some((item) => item.id === c.id)
        if (yaSeleccionada) return false
        return (
            String(c.name ?? "").toLowerCase().includes(busquedaCategoria.toLowerCase()) ||
            String(c.complete_name ?? "").toLowerCase().includes(busquedaCategoria.toLowerCase())
        )
    })

    // ── HANDLERS ────────────────────────────────────────────
    const handleSeleccionarProducto = (producto) => {
        setProductosSeleccionados((prev) => [...prev, producto])
        setBusquedaProducto("")
    }

    const handleQuitarProducto = (id) => {
        setProductosSeleccionados((prev) => prev.filter((p) => p.id !== id))
    }

    const handleSeleccionarUbicacion = (ubicacion) => {
        setUbicacionesSeleccionadas((prev) => [...prev, ubicacion])
        setBusquedaUbicacion("")
    }

    const handleQuitarUbicacion = (id) => {
        setUbicacionesSeleccionadas((prev) => prev.filter((u) => u.id !== id))
    }

    const handleSeleccionarCategoria = (categoria) => {
        setCategoriasSeleccionadas((prev) => [...prev, categoria])
        setBusquedaCategoria("")
    }

    const handleQuitarCategoria = (id) => {
        setCategoriasSeleccionadas((prev) => prev.filter((c) => c.id !== id))
    }

    // ── CONSULTAR ───────────────────────────────────────────
    const handleConsultar = async () => {
        if (!fechaCorte) { alert("La fecha de corte es requerida"); return }

        setLoadingDatos(true)
        setConsultado(true)

        try {
            const token = Cookies.get("access_token")
            const res = await axios.post(
                `${API_URL}rep-valoracion-ubicacion/`,
                {
                    fecha_corte:        fechaCorte,
                    ubicaciones:        ubicacionesSeleccionadas.map((u) => u.id),
                    productos:          productosSeleccionados.map((p) => p.id),
                    categorias:         categoriasSeleccionadas.map((c) => c.id),
                    excluir_stock_cero: excluirStockCero,
                },
                { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
            )
            setData(res.data ?? null)
        } catch (err) {
            console.error("Error al consultar valoración:", err)
            setData(null)
        } finally {
            setLoadingDatos(false)
        }
    }

    // ── HELPERS ─────────────────────────────────────────────
    const fmt = (n) =>
        n === null || n === undefined || n === ""
            ? "—"
            : Number(n).toLocaleString("es-EC")

    const fmtMoney = (n) =>
        n === null || n === undefined || n === ""
            ? "0.00"
            : Number(n).toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const productosData = data?.datos ?? []

    const totalProductos        = data?.total_registros ?? productosData.length
    const cantidadTotalGeneral  = productosData.reduce((acc, p) => acc + (p.cantidad_total ?? 0), 0)
    const valorTotalGeneral     = productosData.reduce((acc, p) => acc + (p.valor_total ?? 0), 0)
    const costoPromedioGeneral  = cantidadTotalGeneral ? valorTotalGeneral / cantidadTotalGeneral : 0

    // ── EXPORT EXCEL ────────────────────────────────────────
    const handleExportExcel = () => {
        if (!data || productosData.length === 0) { alert("No hay datos para exportar"); return }

        const wb = XLSX.utils.book_new()

        // Ubicaciones únicas presentes en los resultados (columnas dinámicas)
        const ubicacionesUnicas = Array.from(
            new Set(productosData.flatMap((p) => (p.ubicaciones ?? []).map((u) => u.ubicacion)))
        ).sort()

        const grupos    = [...ubicacionesUnicas, "TOTAL"]
        const totalCols = 3 + grupos.length * 2

        const filaUbicaciones = ["", "", ""]
        grupos.forEach((g) => filaUbicaciones.push(`${g}/Stock`, ""))

        const filaColumnas = ["Producto", "Categoría", "Costo Unitario"]
        grupos.forEach(() => filaColumnas.push("Cantidad", "Valor"))

        const filasProductos = productosData.map((p) => {
            const fila = [
                `[${p.producto_codigo}] ${p.producto_nombre}`,
                p.categoria,
                p.costo_unitario ?? 0,
            ]
            ubicacionesUnicas.forEach((ubic) => {
                const u = (p.ubicaciones ?? []).find((x) => x.ubicacion === ubic)
                fila.push(u?.cantidad ?? 0, u?.valor_total ?? 0)
            })
            fila.push(p.cantidad_total ?? 0, p.valor_total ?? 0)
            return fila
        })

        const ws = XLSX.utils.aoa_to_sheet([
            ["Reporte de Valoración de Inventario"],
            [`Fecha de corte: ${data.fecha_corte}`],
            [],
            filaUbicaciones,
            filaColumnas,
            ...filasProductos,
        ])

        ws["!merges"] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
            ...grupos.map((_, i) => ({
                s: { r: 3, c: 3 + i * 2 },
                e: { r: 3, c: 3 + i * 2 + 1 },
            })),
        ]

        ws["!cols"] = [
            { wch: 45 }, { wch: 28 }, { wch: 12 },
            ...grupos.flatMap(() => [{ wch: 10 }, { wch: 12 }]),
        ]

        XLSX.utils.book_append_sheet(wb, ws, "Valoracion")

        const fechaExport = new Date().toISOString().slice(0, 10)
        XLSX.writeFile(wb, `Valoracion_Inventario_${data.fecha_corte}_${fechaExport}.xlsx`)
    }

    // ── EXPORT PDF ──────────────────────────────────────────
    const handleExportPDF = () => {
        if (!data || productosData.length === 0) { alert("No hay datos para exportar"); return }

        const doc        = new jsPDF()
        const pageWidth  = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()

        // Agrupar productos por ubicación
        const porUbicacion = new Map()
        productosData.forEach((p) => {
            (p.ubicaciones ?? []).forEach((u) => {
                if (!porUbicacion.has(u.ubicacion)) porUbicacion.set(u.ubicacion, [])
                porUbicacion.get(u.ubicacion).push({
                    producto:  `[${p.producto_codigo}] ${p.producto_nombre}`,
                    categoria: p.categoria,
                    cantidad:  u.cantidad,
                    costo:     p.costo_unitario,
                    total:     u.valor_total,
                })
            })
        })

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
        doc.text("Fecha de corte:", 14, 39)
        doc.setTextColor(0)
        doc.text(data.fecha_corte, 38, 39)

        doc.setTextColor(120)
        doc.text(`Generado: ${fechaGeneracion}`, pageWidth - 14, 39, { align: "right" })
        doc.setTextColor(0)

        doc.setFontSize(13)
        doc.setFont("helvetica", "bold")
        doc.text("Valoración de Inventario (Ubicación)", 14, 47)
        doc.setFont("helvetica", "normal")

        let startY = 55

        Array.from(porUbicacion.keys()).sort().forEach((ubicacion) => {
            const items          = porUbicacion.get(ubicacion)
            const totalUbicacion = items.reduce((acc, it) => acc + (it.total ?? 0), 0)

            if (startY > pageHeight - 40) {
                doc.addPage()
                startY = 20
            }

            doc.setFillColor(200, 200, 200)
            doc.rect(14, startY - 4, pageWidth - 28, 7, "F")
            doc.setFontSize(9)
            doc.setFont("helvetica", "bold")
            doc.setTextColor(40)
            doc.text(`${ubicacion}`, 16, startY)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(0)

            autoTable(doc, {
                startY: startY + 4,
                head: [["Producto", "Categoría", "Cantidad", "Costo", "Total"]],
                body: items.map((it) => [
                    it.producto,
                    it.categoria,
                    fmt(it.cantidad),
                    fmtMoney(it.costo),
                    fmtMoney(it.total),
                ]),
                foot: [[
                    { content: "Total:", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
                    { content: fmtMoney(totalUbicacion), styles: { halign: "right", fontStyle: "bold" } },
                ]],
                styles: { fontSize: 8 },
                headStyles: { fillColor: [250, 0, 0], textColor: 255, fontStyle: "bold" },
                columnStyles: {
                    2: { halign: "right" },
                    3: { halign: "right" },
                    4: { halign: "right" },
                },
            })

            startY = doc.lastAutoTable.finalY + 10
        })

        const fechaExport = new Date().toISOString().slice(0, 10)
        doc.save(`Valoracion_Inventario_${data.fecha_corte}_${fechaExport}.pdf`)
    }

    // ── RENDER ──────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-100">
            <NavBar />
            <main className="max-w-full mx-auto px-6 py-8">

                {/* ENCABEZADO */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Reporte de Valoración de Inventario</h1>
                    <p className="text-sm text-gray-500 mt-1">Valoración de existencias por ubicación a una fecha de corte</p>
                </div>

                {/* FILTROS */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm w-full">
                    <div className="flex flex-col lg:flex-row items-end gap-4">

                        {/* FECHA DE CORTE */}
                        <div className="flex flex-col gap-1 flex-1 w-full">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <Calendar size={15} className="text-gray-400" /> Fecha de Corte <span className="text-red-500">*</span>
                            </label>
                            <input type="date" value={fechaCorte} onChange={(e) => setFechaCorte(e.target.value)}
                                className="border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white w-full h-[38px]" />
                        </div>

                        {/* PRODUCTOS */}
                        <div className="flex flex-col gap-1 flex-[2] w-full">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <Package size={15} className="text-gray-400" /> Productos
                            </label>
                            <div className="relative">
                                <div className="border border-gray-300 rounded-lg px-2 py-1 bg-white min-h-[38px] flex flex-wrap gap-1 items-center">
                                    {productosSeleccionados.map((p) => (
                                        <span key={p.id} className="flex items-center gap-1 bg-gray-100 border border-gray-300 text-gray-700 text-xs rounded px-2 py-1">
                                            <span className="font-semibold">{p.default_code}</span>
                                            <span className="text-gray-500 max-w-[140px] truncate">{p.name}</span>
                                            <button type="button" onClick={() => handleQuitarProducto(p.id)}
                                                className="text-gray-400 hover:text-red-500 font-bold">×</button>
                                        </span>
                                    ))}
                                    <input type="text" value={busquedaProducto}
                                        onChange={(e) => { setBusquedaProducto(e.target.value); setMostrarDropdownProducto(true) }}
                                        onFocus={() => setMostrarDropdownProducto(true)}
                                        onBlur={() => setTimeout(() => setMostrarDropdownProducto(false), 150)}
                                        placeholder={productosSeleccionados.length === 0 ? (loadingProductos ? "Cargando..." : "Todos los productos") : ""}
                                        disabled={loadingProductos}
                                        className="flex-1 outline-none text-sm min-w-[120px] bg-transparent"
                                    />
                                </div>
                                {mostrarDropdownProducto && busquedaProducto && (
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
                                        disabled={loadingUbicaciones}
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

                        {/* CATEGORÍAS */}
                        <div className="flex flex-col gap-1 flex-[2] w-full">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <Tag size={15} className="text-gray-400" /> Categorías
                            </label>
                            <div className="relative">
                                <div className="border border-gray-300 rounded-lg px-2 py-1 bg-white min-h-[38px] flex flex-wrap gap-1 items-center">
                                    {categoriasSeleccionadas.map((c) => (
                                        <span key={c.id} className="flex items-center gap-1 bg-gray-100 border border-gray-300 text-gray-700 text-xs rounded px-2 py-1">
                                            {c.complete_name ?? c.name}
                                            <button type="button" onClick={() => handleQuitarCategoria(c.id)}
                                                className="text-gray-400 hover:text-red-500 font-bold">×</button>
                                        </span>
                                    ))}
                                    <input type="text" value={busquedaCategoria}
                                        onChange={(e) => { setBusquedaCategoria(e.target.value); setMostrarDropdownCategoria(true) }}
                                        onFocus={() => setMostrarDropdownCategoria(true)}
                                        onBlur={() => setTimeout(() => setMostrarDropdownCategoria(false), 150)}
                                        placeholder={categoriasSeleccionadas.length === 0 ? (loadingCategorias ? "Cargando..." : "Todas las categorías") : ""}
                                        disabled={loadingCategorias}
                                        className="flex-1 outline-none text-sm min-w-[120px] bg-transparent"
                                    />
                                </div>
                                {mostrarDropdownCategoria && busquedaCategoria && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                                        {categoriasFiltradas.length > 0 ? categoriasFiltradas.map((c) => (
                                            <div key={c.id}
                                                onMouseDown={(e) => { e.preventDefault(); handleSeleccionarCategoria(c) }}
                                                className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                                <span className="font-semibold text-gray-800">{c.complete_name ?? c.name}</span>
                                            </div>
                                        )) : (
                                            <div className="px-4 py-3 text-sm text-gray-400">No se encontraron categorías</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* EXCLUIR STOCK CERO + CONSULTAR */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-100">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
                            <input type="checkbox" checked={excluirStockCero}
                                onChange={(e) => setExcluirStockCero(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                            <EyeOff size={15} className="text-gray-400" />
                            Excluir productos con stock en cero
                        </label>

                        <button onClick={handleConsultar}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors whitespace-nowrap h-[38px]">
                            <Search size={16} /> Consultar
                        </button>
                    </div>
                </div>

                {/* ESTADO VACÍO / CARGANDO */}
                {(!consultado || loadingDatos || !data) && (
                    <div className="bg-white border border-dashed border-gray-300 rounded-2xl mt-6 py-20 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <AlertCircle size={28} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {loadingDatos ? "Consultando..." : "Sin datos para mostrar"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {loadingDatos
                                ? "Obteniendo la valoración del inventario."
                                : 'Seleccione una fecha de corte y haga clic en "Consultar" para ver el reporte.'}
                        </p>
                    </div>
                )}

                {/* RESULTADOS */}
                {consultado && !loadingDatos && data && (
                    <div className="mt-6 space-y-6">

                        {/* TARJETAS RESUMEN */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                            {/* Productos */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between text-gray-500 text-sm">
                                    Productos <Layers size={16} className="text-gray-400" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900 mt-3">{fmt(totalProductos)}</p>
                            </div>

                            {/* Cantidad Total */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between text-gray-500 text-sm">
                                    Cantidad Total <Box size={16} className="text-gray-400" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900 mt-3">{fmt(cantidadTotalGeneral)}</p>
                            </div>

                            {/* Valor Total */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between text-gray-500 text-sm">
                                    Valor Total Inventario <DollarSign size={16} className="text-green-600" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900 mt-3">${fmtMoney(valorTotalGeneral)}</p>
                            </div>

                            {/* Costo Promedio */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between text-gray-500 text-sm">
                                    Costo Promedio <TrendingUp size={16} className="text-gray-400" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900 mt-3">${fmtMoney(costoPromedioGeneral)}</p>
                            </div>

                        </div>

                        {/* TABLA DE VALORACIÓN */}
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

                            {/* Header tabla */}
                            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                        <Layers size={15} className="text-gray-400" />
                                        Detalle de Valoración
                                        <span className="ml-1 text-sm font-normal text-gray-400">
                                            ({productosData.length} producto{productosData.length !== 1 ? "s" : ""})
                                        </span>
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Fecha de corte: <span className="font-semibold text-gray-700">{data.fecha_corte}</span>
                                    </p>
                                </div>

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

                            {/* Tabla */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                                            <th className="px-4 py-3 font-medium">Código</th>
                                            <th className="px-4 py-3 font-medium">Producto</th>
                                            <th className="px-4 py-3 font-medium">Categoría</th>
                                            <th className="px-4 py-3 font-medium text-right">Costo Unit.</th>
                                            <th className="px-4 py-3 font-medium text-right">Cantidad Total</th>
                                            <th className="px-4 py-3 font-medium text-right text-gray-900">Valor Total</th>
                                            <th className="px-4 py-3 font-medium">Ubicaciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productosData.length > 0 ? productosData.map((p) => (
                                            <tr key={p.producto_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <span className="text-xs border border-gray-300 rounded px-2 py-0.5 text-gray-700 font-mono">
                                                        {p.producto_codigo}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-800 font-medium">{p.producto_nombre}</td>
                                                <td className="px-4 py-3 text-gray-500">{p.categoria}</td>
                                                <td className="px-4 py-3 text-right text-gray-500">${fmtMoney(p.costo_unitario)}</td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-800">{fmt(p.cantidad_total)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900">${fmtMoney(p.valor_total)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {(p.ubicaciones ?? []).map((u, i) => (
                                                            <span key={i} className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 text-xs rounded px-2 py-0.5 whitespace-nowrap">
                                                                <span className="font-medium text-gray-700">{u.ubicacion}</span>
                                                                <span className="text-gray-400">·</span>
                                                                <span className="text-gray-600">{fmt(u.cantidad)}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                                                    {data.mensaje || "No se encontraron productos para los filtros seleccionados"}
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

export default RepValoracionUbicacion
