import * as XLSX from 'xlsx'

const MESES = [
  { key: "01", label: "Ene" },
  { key: "02", label: "Feb" },
  { key: "03", label: "Mar" },
  { key: "04", label: "Abr" },
  { key: "05", label: "May" },
  { key: "06", label: "Jun" },
  { key: "07", label: "Jul" },
  { key: "08", label: "Ago" },
  { key: "09", label: "Sep" },
  { key: "10", label: "Oct" },
  { key: "11", label: "Nov" },
  { key: "12", label: "Dic" },
]

export function ReporteCobranzasTable({ data }) {
  // Obtener todos los años disponibles
  const aniosSet = new Set()
  Object.values(data).forEach((vendedorData) => {
    Object.keys(vendedorData).forEach((key) => {
      if (key !== "total_esperado" && key !== "total_cobrado" && key !== "total_nc") {
        aniosSet.add(key)
      }
    })
  })
  const aniosDisponibles = Array.from(aniosSet).sort()

  // Obtener meses con datos para cada año
  const getMesesConDatos = (anio) => {
    const mesesSet = new Set()
    Object.values(data).forEach((vendedorData) => {
      if (vendedorData[anio]) {
        Object.keys(vendedorData[anio]).forEach((mes) => {
          mesesSet.add(mes)
        })
      }
    })
    // Ordenar los meses y filtrar solo los que están en MESES
    return MESES.filter(({ key }) => mesesSet.has(key))
  }

  // Crear un objeto con los meses disponibles por año
  const mesesPorAnio = {}
  aniosDisponibles.forEach((anio) => {
    mesesPorAnio[anio] = getMesesConDatos(anio)
  })

  // Colores para cada año
  const coloresAnio = {
    2024: { header: "bg-purple-100 text-purple-800", cell: "bg-purple-50", total: "bg-purple-100" },
    2025: { header: "bg-blue-100 text-blue-800", cell: "bg-blue-50", total: "bg-blue-100" },
    2026: { header: "bg-green-100 text-green-800", cell: "bg-green-50", total: "bg-green-100" },
    2027: { header: "bg-orange-100 text-orange-800", cell: "bg-orange-50", total: "bg-orange-100" },
    2028: { header: "bg-pink-100 text-pink-800", cell: "bg-pink-50", total: "bg-pink-100" },
  }

  const getColorAnio = (anio, tipo) => {
    return coloresAnio[anio]?.[tipo] || { header: "bg-gray-100", cell: "bg-gray-50", total: "bg-gray-100" }[tipo]
  }

  // Lista de vendedores ordenados de A a Z
  const vendedores = Object.keys(data).sort((a, b) => a.localeCompare(b, 'es'))

  // Obtener datos del mes
  const getDatosMes = (vendedor, anio, mes) => {
    const vendedorData = data[vendedor]
    if (!vendedorData || !vendedorData[anio] || !vendedorData[anio][mes]) {
      return { esperado: 0, cobrado: 0, total_nc: 0 }
    }
    return {
      esperado: vendedorData[anio][mes].esperado ?? 0,
      cobrado: vendedorData[anio][mes].cobrado ?? 0,
      total_nc: vendedorData[anio][mes].total_nc ?? 0,
    }
  }

  // Formatear moneda
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === 0) return "-"
    return `$${value.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Total por vendedor
  const getTotalVendedor = (vendedor, tipo) => {
    if (tipo === "esperado" && data[vendedor].total_esperado !== undefined) {
      return data[vendedor].total_esperado
    }
    if (tipo === "cobrado" && data[vendedor].total_cobrado !== undefined) {
      return data[vendedor].total_cobrado
    }
    if (tipo === "total_nc" && data[vendedor].total_nc !== undefined) {
      return data[vendedor].total_nc
    }
    
    let total = 0
    aniosDisponibles.forEach((anio) => {
      mesesPorAnio[anio].forEach(({ key }) => {
        const datos = getDatosMes(vendedor, anio, key)
        if (datos[tipo] !== null && datos[tipo] !== undefined) total += datos[tipo]
      })
    })
    return total
  }

  // Total por columna
  const getTotalColumna = (anio, mes, tipo) => {
    let total = 0
    vendedores.forEach((vendedor) => {
      const datos = getDatosMes(vendedor, anio, mes)
      if (datos[tipo] !== null && datos[tipo] !== undefined) total += datos[tipo]
    })
    return total
  }

  // Gran total
  const getGranTotal = (tipo) => {
    let total = 0
    vendedores.forEach((vendedor) => {
      total += getTotalVendedor(vendedor, tipo)
    })
    return total
  }

  // Función para exportar a Excel
  const exportToExcel = () => {
    // Crear las filas del Excel
    const excelData = []
    
    // Fila 1: Años
    const row1 = ['VENDEDOR']
    aniosDisponibles.forEach((anio) => {
      const cantidadColumnas = mesesPorAnio[anio].length * 2
      row1.push(`AÑO ${anio}`)
      // Agregar celdas vacías para el merge
      for (let i = 1; i < cantidadColumnas; i++) {
        row1.push('')
      }
    })
    row1.push('TOTALES', '')
    excelData.push(row1)
    
    // Fila 2: Meses
    const row2 = ['']
    aniosDisponibles.forEach((anio) => {
      mesesPorAnio[anio].forEach(({ label }) => {
        row2.push(label, '')
      })
    })
    row2.push('', '')
    excelData.push(row2)
    
    // Fila 3: Encabezados de columnas
    const row3 = ['']
    aniosDisponibles.forEach((anio) => {
      mesesPorAnio[anio].forEach(() => {
        row3.push('ESPERADO', 'COBRADO')
      })
    })
    row3.push('ESPERADO', 'COBRADO')
    excelData.push(row3)
    
    // Filas de vendedores
    vendedores.forEach((vendedor) => {
      const row = [vendedor]
      aniosDisponibles.forEach((anio) => {
        mesesPorAnio[anio].forEach(({ key }) => {
          const datos = getDatosMes(vendedor, anio, key)
          row.push(
            datos.esperado || 0,
            datos.cobrado || 0
          )
        })
      })
      row.push(
        getTotalVendedor(vendedor, 'esperado'),
        getTotalVendedor(vendedor, 'cobrado')
      )
      excelData.push(row)
    })
    
    // Fila de totales
    const rowTotal = ['TOTAL']
    aniosDisponibles.forEach((anio) => {
      mesesPorAnio[anio].forEach(({ key }) => {
        rowTotal.push(
          getTotalColumna(anio, key, 'esperado'),
          getTotalColumna(anio, key, 'cobrado')
        )
      })
    })
    rowTotal.push(
      getGranTotal('esperado'),
      getGranTotal('cobrado')
    )
    excelData.push(rowTotal)
    
    // Crear el libro de Excel
    const ws = XLSX.utils.aoa_to_sheet(excelData)
    
    // Configurar anchos de columna
    const colWidths = [{ wch: 25 }] // Columna de vendedor
    aniosDisponibles.forEach((anio) => {
      mesesPorAnio[anio].forEach(() => {
        colWidths.push({ wch: 12 }, { wch: 12 })
      })
    })
    colWidths.push({ wch: 12 }, { wch: 12 })
    ws['!cols'] = colWidths
    
    // Crear el libro
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Cobranzas')
    
    // Generar el archivo
    const fecha = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `Reporte_Cobranzas_${fecha}.xlsx`)
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Reporte de Cobranzas por Vendedor
        </h2>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          Exportar a Excel
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          {/* Fila 1: AÑO */}
          <tr className="bg-gray-100">
            <th rowSpan={3} className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700 min-w-[200px]">
              VENDEDOR
            </th>
            {aniosDisponibles.map((anio) => (
              <th
                key={anio}
                colSpan={mesesPorAnio[anio].length * 3}
                className={`border border-gray-200 px-2 py-2 text-center font-bold text-base ${getColorAnio(anio, "header")}`}
              >
                AÑO {anio}
              </th>
            ))}
            <th colSpan={3} rowSpan={2} className="border border-gray-200 px-2 py-2 text-center font-bold text-base bg-gray-100">
              TOTALES
            </th>
          </tr>
          
          {/* Fila 2: MES */}
          <tr>
            {aniosDisponibles.map((anio) =>
              mesesPorAnio[anio].map(({ label, key }) => (
                <th
                  key={`${anio}-${label}`}
                  colSpan={3}
                  className={`border border-gray-200 px-2 py-2 text-center font-semibold text-sm ${getColorAnio(anio, "cell")}`}
                >
                  {label}
                </th>
              ))
            )}
          </tr>
          
          {/* Fila 3: ESPERADO, COBRADO, TOTAL NC */}
          <tr>
            {aniosDisponibles.map((anio) =>
              mesesPorAnio[anio].map(({ key }) => (
                <>
                  <th key={`${anio}-${key}-esp`} className={`border border-gray-200 px-1 py-2 text-center text-xs font-semibold min-w-[90px] ${getColorAnio(anio, "cell")}`}>
                    ESPERADO
                  </th>
                  <th key={`${anio}-${key}-cob`} className={`border border-gray-200 px-1 py-2 text-center text-xs font-semibold min-w-[90px] ${getColorAnio(anio, "cell")}`}>
                    COBRADO
                  </th>
                  <th key={`${anio}-${key}-nc`} className={`border border-gray-200 px-1 py-2 text-center text-xs font-semibold min-w-[90px] ${getColorAnio(anio, "cell")}`}>
                    TOTAL NC
                  </th>
                </>
              ))
            )}
            <th className="border border-gray-200 px-2 py-2 text-center text-xs font-semibold min-w-[90px] bg-gray-50">
              ESPERADO
            </th>
            <th className="border border-gray-200 px-2 py-2 text-center text-xs font-semibold min-w-[90px] bg-gray-50">
              COBRADO
            </th>
            <th className="border border-gray-200 px-2 py-2 text-center text-xs font-semibold min-w-[90px] bg-gray-50">
              TOTAL NC
            </th>
          </tr>
        </thead>
        
        <tbody>
          {vendedores.map((vendedor) => (
            <tr key={vendedor} className="hover:bg-gray-50">
              <td className="border border-gray-200 px-4 py-2 font-medium text-gray-800 text-left">
                {vendedor}
              </td>
              {aniosDisponibles.map((anio) =>
                mesesPorAnio[anio].map(({ key }) => {
                  const datos = getDatosMes(vendedor, anio, key)
                  const hasData = datos.esperado > 0 || datos.cobrado > 0 || datos.total_nc > 0
                  return (
                    <>
                      <td key={`${vendedor}-${anio}-${key}-esp`} className={`border border-gray-200 px-2 py-2 text-right text-xs ${getColorAnio(anio, "cell")} ${hasData ? "text-gray-800" : "text-gray-400"}`}>
                        {formatCurrency(datos.esperado)}
                      </td>
                      <td key={`${vendedor}-${anio}-${key}-cob`} className={`border border-gray-200 px-2 py-2 text-right text-xs ${getColorAnio(anio, "cell")} ${datos.cobrado > 0 ? "text-gray-800 font-semibold" : "text-gray-400"}`}>
                        {formatCurrency(datos.cobrado)}
                      </td>
                      <td key={`${vendedor}-${anio}-${key}-nc`} className={`border border-gray-200 px-2 py-2 text-right text-xs ${getColorAnio(anio, "cell")} ${hasData ? "text-gray-800" : "text-gray-400"}`}>
                        {formatCurrency(datos.total_nc)}
                      </td>
                    </>
                  )
                })
              )}
              <td className="border border-gray-200 px-2 py-2 text-right text-xs font-medium text-gray-800 bg-gray-50">
                {formatCurrency(getTotalVendedor(vendedor, "esperado"))}
              </td>
              <td className="border border-gray-200 px-2 py-2 text-right text-xs font-semibold text-gray-800 bg-gray-50">
                {formatCurrency(getTotalVendedor(vendedor, "cobrado"))}
              </td>
              <td className="border border-gray-200 px-2 py-2 text-right text-xs font-medium text-gray-800 bg-gray-50">
                {formatCurrency(getTotalVendedor(vendedor, "total_nc"))}
              </td>
            </tr>
          ))}
          
          {/* Fila de totales */}
          <tr className="font-semibold bg-gray-100">
            <td className="border border-gray-200 px-4 py-3 font-bold text-gray-800 text-left">
              TOTAL
            </td>
            {aniosDisponibles.map((anio) =>
              mesesPorAnio[anio].map(({ key }) => (
                <>
                  <td key={`total-${anio}-${key}-esp`} className={`border border-gray-200 px-2 py-3 text-right text-xs text-gray-800 ${getColorAnio(anio, "total")}`}>
                    {formatCurrency(getTotalColumna(anio, key, "esperado"))}
                  </td>
                  <td key={`total-${anio}-${key}-cob`} className={`border border-gray-200 px-2 py-3 text-right text-xs font-semibold text-gray-800 ${getColorAnio(anio, "total")}`}>
                    {formatCurrency(getTotalColumna(anio, key, "cobrado"))}
                  </td>
                  <td key={`total-${anio}-${key}-nc`} className={`border border-gray-200 px-2 py-3 text-right text-xs text-gray-800 ${getColorAnio(anio, "total")}`}>
                    {formatCurrency(getTotalColumna(anio, key, "total_nc"))}
                  </td>
                </>
              ))
            )}
            <td className="border border-gray-200 px-2 py-3 text-right text-xs font-bold text-blue-700 bg-blue-50">
              {formatCurrency(getGranTotal("esperado"))}
            </td>
            <td className="border border-gray-200 px-2 py-3 text-right text-xs font-bold text-blue-700 bg-blue-100">
              {formatCurrency(getGranTotal("cobrado"))}
            </td>
            <td className="border border-gray-200 px-2 py-3 text-right text-xs font-bold text-blue-700 bg-blue-50">
              {formatCurrency(getGranTotal("total_nc"))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}