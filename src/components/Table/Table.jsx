import {useMemo} from "react"
import { FileText, FileSpreadsheet, Search } from "lucide-react"
import { useSearch } from "../../hooks/useSearch"
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoImg from "../../assets/imgLogo.png"
import Cookie from "js-cookie"
import {jwtDecode} from 'jwt-decode'

const Table = ({data, obtener_cartera_completa}) => {

  const getUserPermissions = () => {
    const token = Cookie.get("access_token")
    if (!token) return { can_view_cartera: false, can_export_excel_cartera: false, can_export_all_cartera: false, can_export_pdf_cartera: false }
    try {
      const decoded = jwtDecode(token)
      console.log(decoded)
      return decoded.permisos || { can_view_cartera: false, can_export_excel_cartera: false, can_export_all_cartera: false, can_export_pdf_cartera: false }
    } catch (error) {
      console.error("Error decodificando token:", error)
      return { can_view_cartera: false, can_export_excel_cartera: false, can_export_all_cartera: false, can_export_pdf_cartera: false }
    }
  }

  const userPermissions = getUserPermissions()

  if (!userPermissions.can_view_cartera) {
    return <div>No tienes permisos para acceder a esta sección.</div>
  }

  const cxc = data
  const { isLoading } = useSearch()

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Suma todos los amount_reconcile de los cheques de una factura */
  const getTotalChequesFactura = (factura) => {
    if (!factura.cheques || factura.cheques.length === 0) return 0
    return factura.cheques.reduce((sum, cheque) => {
      return sum + cheque.facturas.reduce((s, f) => s + (f.amount_reconcile || 0), 0)
    }, 0)
  }

  const stats = useMemo(() => {
    let totalBalance = 0
    let totalPaid = 0
    let overdueCount = 0
    let totalInvoices = 0

    cxc.forEach((item) => {
      item.facturas.forEach((factura) => {
        totalInvoices++
        totalBalance += factura.pendiente || 0
        factura.cuotas.forEach((cuota) => {
          totalPaid += cuota.credit || 0
          const vencimiento = new Date(cuota.vencimiento)
          const hoy = new Date()
          const diasDiferencia = Math.floor((vencimiento - hoy) / (1000 * 60 * 60 * 24))
          if (diasDiferencia < 0) overdueCount++
        })
      })
    })

    return {
      totalBalance: totalBalance.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      overdueCount,
      totalInvoices,
    }
  }, [cxc])

  const getDaysOverdue = (vencimiento) => {
    const MS_PER_DAY = 24 * 60 * 60 * 1000

    const parseToUtcMidnight = (s) => {
      if (!s) return NaN
      const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      if (ddmmyyyy) return Date.UTC(parseInt(ddmmyyyy[3], 10), parseInt(ddmmyyyy[2], 10) - 1, parseInt(ddmmyyyy[1], 10))
      const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
      if (iso) return Date.UTC(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10))
      const d = new Date(s)
      if (isNaN(d)) return NaN
      return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
    }

    const vencUtc = parseToUtcMidnight(vencimiento)
    if (isNaN(vencUtc)) throw new Error('Fecha de vencimiento inválida.')
    const now = new Date()
    const todayUtcMidnight = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    return Math.floor((vencUtc - todayUtcMidnight) / MS_PER_DAY)
  }

  const getStatusColor = (daysOverdue, residual) => {
    if (residual === 0) return "text-gray-600 font-bold"
    if (daysOverdue < 0) return "text-red-600 font-bold"
    return "text-gray-600 font-bold"
  }

  const getStatusText = (daysOverdue, residual) => {
    if (residual === 0) return "Pagada"
    if (daysOverdue < 0) return "Vencido"
    if (daysOverdue === 0) return "Vence Hoy"
    return "Al Día"
  }

  const getStatusBgColor = (daysOverdue, residual) => {
    if (residual === 0) return "bg-gray-100 border-gray-300"
    if (daysOverdue < 0) return "bg-red-100 border-red-300"
    if (daysOverdue === 0) return "bg-amber-100 border-amber-300"
    return "bg-gray-100 border-gray-300"
  }

  // ─── Exportar PDF ────────────────────────────────────────────────────────────

  const exportToPDF = (data) => {
    data.sort((a, b) => a.cliente.toLowerCase().localeCompare(b.cliente.toLowerCase()))

    const doc = new jsPDF()
    doc.addImage(logoImg, 'PNG', 14, 10, 50, 15)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("IMPOR EXPORT AROMOTOR CIA. LTDA.", 70, 15)
    doc.setFont("helvetica", "normal")
    doc.text("CALLE CAMINO A LA BENGALA Y AV LOS COLONOS", 70, 21)
    doc.text("Ecuador", 70, 27)
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.1)
    doc.line(14, 32, 200, 32)

    const columns = ['Factura', 'Fecha de Emisión', 'Cuotas', 'Fecha máxima', 'Valor cuota', 'Abono', 'Retención', 'Saldo', 'Valor sin custodia', 'Días']
    const rows = []

    data.forEach(clienteData => {
      const totalCuotasCliente = clienteData.facturas.reduce((sum, f) => sum + f.cuotas.reduce((s, c) => s + c.debit, 0), 0).toFixed(2)
      const totalSaldoCliente = clienteData.facturas.reduce((sum, f) => sum + f.cuotas.reduce((s, c) => s + c.residual, 0), 0).toFixed(2)
      const totalPendienteCliente = clienteData.facturas.reduce((sum, f) => sum + f.pendiente, 0)
      const totalChequesValorCliente = clienteData.facturas.reduce((sum, f) => sum + getTotalChequesFactura(f), 0)
      // ✅ valorSinCustodia = pendiente - cheques
      const valorSinCustodiaCliente = (totalPendienteCliente - totalChequesValorCliente).toFixed(2)

      rows.push([clienteData.cliente, '', '', '', totalCuotasCliente, '', '', totalSaldoCliente, valorSinCustodiaCliente, ''])

      clienteData.facturas.forEach(factura => {
        const totalChequesValorFactura = getTotalChequesFactura(factura)
        // ✅ valorSinCustodia = pendiente - cheques
        const valorSinCustodia = (parseFloat(factura.pendiente) - totalChequesValorFactura).toFixed(2)
        const totalAbono = factura.cuotas.reduce((sum, c) => sum + (c.debit - c.residual), 0).toFixed(2)
        const totalSaldo = factura.cuotas.reduce((sum, c) => sum + c.residual, 0).toFixed(2)
        const totalCuotas = factura.cuotas.reduce((sum, c) => sum + c.debit, 0).toFixed(2)

        rows.push([factura.numero, factura.fecha, '', '', '', '', '', '', '', ''])

        factura.cuotas.forEach((cuota, index) => {
          const daysOverdue = getDaysOverdue(cuota.vencimiento)
          rows.push([
            '', '',
            `${index + 1}`,
            cuota.vencimiento,
            cuota.debit?.toFixed(2) || "0.00",
            (cuota.debit - cuota.residual).toFixed(2),
            '',
            cuota.residual?.toFixed(2) || "0.00",
            '',
            daysOverdue < 0 && cuota.residual > 0 ? `${Math.abs(daysOverdue)}` : "0"
          ])
        })

        rows.push(['Total', '', '', '', totalCuotas, totalAbono, factura.retencion_total?.toFixed(2) || "0.00", totalSaldo, valorSinCustodia, ''])
      })

      rows.push(['', '', '', '', '', '', '', '', '', ''])
    })

    autoTable(doc, {
      startY: 38,
      head: [columns],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [250, 0, 0], textColor: 255, fontStyle: 'bold' },

      didDrawPage: function (data) {
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        const pageText = `pg. ${data.pageNumber}`
        const textWidth = doc.getTextWidth(pageText)
        const pageWidth = doc.internal.pageSize.width
        doc.text(pageText, pageWidth - textWidth - 14, doc.internal.pageSize.height - 10)
      },

      didParseCell: data => {
        if (data.section === 'body') {
          const cellText = data.row.cells[9]?.text[0]
          if (data.column.index === 9 && cellText) {
            const diasMatch = cellText.match(/(\d+)/)
            if (diasMatch) {
              const dias = parseInt(diasMatch[1])
              const residual = parseFloat(data.row.cells[7]?.text[0].replace(/[^0-9.-]+/g, ''))
              if (dias > 0 && residual > 0) {
                Object.values(data.row.cells).forEach(cell => { cell.styles.textColor = [255, 0, 0] })
              }
            }
          }

          const firstCell = data.row.cells[0]?.text[0] || ''
          const thirdCell = data.row.cells[2]?.text[0] || ''
          const fifthCell = data.row.cells[4]?.text[0] || ''

          if (firstCell !== '' && firstCell !== 'Total' && thirdCell === '' && fifthCell !== '') {
            Object.values(data.row.cells).forEach(cell => {
              cell.styles.fontStyle = 'bold'
              cell.styles.fillColor = [190, 190, 190]
            })
          }

          const isEmptyRow = Object.values(data.row.cells).every(cell => !cell.text[0] || cell.text[0].trim() === '')
          if (isEmptyRow) {
            Object.values(data.row.cells).forEach(cell => { cell.styles.fillColor = [255, 255, 255] })
          }

          const secondCell = data.row.cells[1]?.text[0] || ''
          if (firstCell === '' && secondCell === '' && thirdCell !== '' && !isNaN(parseInt(thirdCell))) {
            data.cell.styles.cellPadding = { top: 0.5, right: 2, bottom: 0.5, left: 2 }
          }

          if (firstCell !== '' && firstCell !== 'Total' && thirdCell === '' && fifthCell === '') {
            Object.values(data.row.cells).forEach(cell => {
              cell.styles.fontStyle = 'bold'
              cell.styles.fillColor = [230, 230, 230]
            })
          }
        }
      }
    })

    doc.save("estado_cuenta.pdf")
  }

  // ─── Exportar Excel ──────────────────────────────────────────────────────────

  const exportToExcel = (data) => {
    data.sort((a, b) => a.cliente.toLowerCase().localeCompare(b.cliente.toLowerCase()))

    const rows = []
    rows.push(['Factura', 'Fecha de Emisión', 'Cuotas', 'Fecha máxima', 'Valor cuota', 'Abono', 'Retención', 'Saldo', 'Valor sin custodia', 'Días'])

    data.forEach(clienteData => {
      const totalCuotasCliente = clienteData.facturas.reduce((sum, f) => sum + f.cuotas.reduce((s, c) => s + c.debit, 0), 0).toFixed(2)
      const totalSaldoCliente = clienteData.facturas.reduce((sum, f) => sum + f.cuotas.reduce((s, c) => s + c.residual, 0), 0).toFixed(2)
      const totalPendienteCliente = clienteData.facturas.reduce((sum, f) => sum + f.pendiente, 0)
      const totalChequesValorCliente = clienteData.facturas.reduce((sum, f) => sum + getTotalChequesFactura(f), 0)
      // ✅ valorSinCustodia = pendiente - cheques
      const valorSinCustodiaCliente = (totalPendienteCliente - totalChequesValorCliente).toFixed(2)

      rows.push([clienteData.cliente, '', '', '', totalCuotasCliente, '', '', totalSaldoCliente, valorSinCustodiaCliente, ''])

      clienteData.facturas.forEach((factura) => {
        const totalChequesValorFactura = getTotalChequesFactura(factura)
        // ✅ valorSinCustodia = pendiente - cheques
        const valorSinCustodia = (parseFloat(factura.pendiente) - totalChequesValorFactura).toFixed(2)
        const totalAbono = factura.cuotas.reduce((sum, c) => sum + (c.debit - c.residual), 0).toFixed(2)
        const totalSaldo = factura.cuotas.reduce((sum, c) => sum + c.residual, 0).toFixed(2)
        const totalCuotas = factura.cuotas.reduce((sum, c) => sum + c.debit, 0).toFixed(2)

        rows.push([factura.numero, factura.fecha, '', '', '', '', '', '', '', ''])

        factura.cuotas.forEach((cuota, index) => {
          const daysOverdue = getDaysOverdue(cuota.vencimiento)
          rows.push([
            '', '',
            `Cuota ${index + 1}`,
            cuota.vencimiento,
            cuota.debit?.toFixed(2) || "0.00",
            (cuota.debit - cuota.residual).toFixed(2),
            '',
            cuota.residual?.toFixed(2) || "0.00",
            '',
            cuota.residual === 0 ? "0 días" : daysOverdue < 0 ? `${Math.abs(daysOverdue)} días` : "0 días"
          ])
        })

        rows.push(['Total', '', '', '', totalCuotas, totalAbono, factura.retencion_total?.toFixed(2) || "0.00", totalSaldo, valorSinCustodia, ''])
      })
    })

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Estado de Cuenta")
    XLSX.writeFile(wb, "estado_cuenta.xlsx")
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="h-96 flex flex-col items-center justify-center">
            <div className="relative mb-8">
              <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-red-600 border-r-red-600 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Cargando estado de cuenta...</h3>
            <p className="text-gray-600">Conectando con el servidor</p>
          </div>
        </main>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-end p-4 space-x-2">
        {userPermissions.can_export_all_cartera && (
          <button
            className="flex items-center px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-600 transition-colors duration-200 shadow-sm"
            onClick={() => obtener_cartera_completa()}
          >
            <Search className="w-4 h-4 mr-2" />
            Cartera Completa
          </button>
        )}
        {userPermissions.can_export_pdf_cartera && (
          <button
            className="flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 shadow-sm"
            onClick={() => exportToPDF(cxc)}
          >
            <FileText className="w-4 h-4 mr-2" />
            Exportar PDF
          </button>
        )}
        {userPermissions.can_export_excel_cartera && (
          <button
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200 shadow-sm"
            onClick={() => exportToExcel(cxc)}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar Excel
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide w-48">Factura</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide w-40">Fecha de Emisión</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide w-24">Cuotas</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide w-28">Fecha máxima</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide w-28">Valor cuota</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide w-24">Abono</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide w-24">Retención</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide w-24">Saldo</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide w-28">Valor sin custodia</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide w-20">Días</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {cxc.length > 0 ? (
              cxc
                .sort((a, b) => a.cliente.toLowerCase().localeCompare(b.cliente.toLowerCase()))
                .flatMap((clienteData) => {
                  const clientRows = []

                  // Totales del cliente
                  const totalCuotasCliente = clienteData.facturas.reduce((sum, f) => sum + f.cuotas.reduce((s, c) => s + c.debit, 0), 0).toFixed(2)
                  const totalSaldoCliente = clienteData.facturas.reduce((sum, f) => sum + f.cuotas.reduce((s, c) => s + c.residual, 0), 0).toFixed(2)
                  const totalPendienteCliente = clienteData.facturas.reduce((sum, f) => sum + f.pendiente, 0)
                  const totalChequesValorCliente = clienteData.facturas.reduce((sum, f) => sum + getTotalChequesFactura(f), 0)
                  // ✅ valorSinCustodia cliente = pendiente total - cheques total
                  const valorSinCustodiaCliente = (totalPendienteCliente - totalChequesValorCliente).toFixed(2)

                  clientRows.push(
                    <tr key={`client-${clienteData.cliente}`} className="bg-gray-200 font-bold">
                      <td colSpan="4" className="px-6 py-4 text-sm text-gray-900 uppercase">{clienteData.cliente}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">$ {totalCuotasCliente}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900"></td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900"></td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">$ {totalSaldoCliente}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">$ {valorSinCustodiaCliente}</td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  )

                  clienteData.facturas.forEach((factura) => {
                    const totalChequesValorFactura = getTotalChequesFactura(factura)
                    // ✅ valorSinCustodia = pendiente - cheques
                    const valorSinCustodia = (parseFloat(factura.pendiente) - totalChequesValorFactura).toFixed(2)
                    const totalAbono = factura.cuotas.reduce((sum, c) => sum + (c.debit - c.residual), 0).toFixed(2)
                    const totalSaldo = factura.cuotas.reduce((sum, c) => sum + c.residual, 0).toFixed(2)
                    const totalCuotas = factura.cuotas.reduce((sum, c) => sum + c.debit, 0).toFixed(2)

                    clientRows.push(
                      <tr key={`factura-${factura.id}`} className="bg-gray-100">
                        <td className="px-6 py-3 text-sm font-bold text-gray-900 truncate">{factura.numero}</td>
                        <td className="px-6 py-3 text-xs font-bold text-gray-700">{factura.fecha}</td>
                        <td className="px-6 py-3 text-xs text-gray-700">-</td>
                        <td className="px-6 py-3 text-sm text-gray-700">-</td>
                        <td className="px-6 py-3 text-sm font-semibold text-gray-900">-</td>
                        <td className="px-6 py-3 text-sm font-bold text-gray-900">-</td>
                        <td className="px-6 py-3 text-sm">-</td>
                        <td className="px-6 py-3 text-sm font-bold text-gray-900">-</td>
                        <td className="px-6 py-3 text-sm">-</td>
                        <td className="px-6 py-3 text-sm">-</td>
                      </tr>
                    )

                    factura.cuotas.forEach((cuota, index) => {
                      const daysOverdue = getDaysOverdue(cuota.vencimiento)
                      const isOverdue = daysOverdue < 0 && cuota.residual > 0 && totalChequesValorFactura === 0

                      clientRows.push(
                        <tr key={`cuota-${factura.id}-${index}`} className="group">
                          <td className={`px-6 py-3 text-sm font-medium text-gray-700 ${isOverdue ? 'text-red-600 font-bold' : ''}`}>-</td>
                          <td className={`px-6 py-3 text-sm text-gray-600 ${isOverdue ? 'text-red-600 font-bold' : ''}`}>-</td>
                          <td className={`px-5 py-3 text-sm text-gray-700 ${isOverdue ? 'text-red-600 font-bold' : ''}`}>Cuota {index + 1}</td>
                          <td className={`px-6 py-3 text-sm text-gray-700 ${isOverdue ? 'text-red-600 font-bold' : ''}`}>{cuota.vencimiento}</td>
                          <td className={`px-6 py-3 text-sm font-semibold text-gray-900 ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                            $ {cuota.debit?.toFixed(2) || "0.00"}
                          </td>
                          <td className={`px-6 py-3 text-sm font-semibold text-gray-900 ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                            $ {(cuota.debit - cuota.residual).toFixed(2)}
                          </td>
                          <td className={`px-6 py-3 text-sm ${isOverdue ? 'text-red-600 font-bold' : ''}`}>-</td>
                          <td className={`px-6 py-3 text-sm font-semibold text-gray-900 ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                            $ {cuota.residual?.toFixed(2) || "0.00"}
                          </td>
                          <td className={`px-6 py-3 text-sm ${isOverdue ? 'text-red-600 font-bold' : ''}`}>-</td>
                          <td className={`px-6 py-3 text-sm ${getStatusColor(daysOverdue, cuota.residual)} whitespace-nowrap`}>
                            {cuota.residual === 0 ? "0 días" : daysOverdue < 0 ? `${Math.abs(daysOverdue)} días` : "0 días"}
                          </td>
                        </tr>
                      )
                    })

                    clientRows.push(
                      <tr key={`total-${factura.id}`} className="bg-blue-50 font-bold">
                        <td colSpan="4" className="px-6 py-3 text-sm text-gray-900">Total</td>
                        <td className="px-6 py-3 text-sm font-bold text-gray-900">$ {totalCuotas}</td>
                        <td className="px-6 py-3 text-sm font-bold text-gray-900">$ {totalAbono}</td>
                        <td className="px-6 py-3 text-sm font-bold text-gray-900">$ {factura.retencion_total?.toFixed(2) || "0.00"}</td>
                        <td className="px-6 py-3 text-sm font-bold text-gray-900">$ {totalSaldo}</td>
                        <td className="px-6 py-3 text-sm font-bold text-gray-900">$ {valorSinCustodia}</td>
                        <td className="px-6 py-3 text-sm"></td>
                      </tr>
                    )
                  })

                  return clientRows
                })
            ) : (
              <tr>
                <td colSpan="10" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Search className="w-8 h-8 text-gray-300" />
                    <p className="text-gray-600 font-semibold">No se encontraron facturas</p>
                    <p className="text-gray-400 text-sm">Intenta otro término de búsqueda</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Table