import { createContext, useState } from "react"

export const SearchContext = createContext()

export function SearchProvider({ children }) {

  const [clientes, setClientes] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchTermVendedor, setSearchTermVendedor] = useState("")
  const [fechaEmisionDesde, setFechaEmisionDesde] = useState("")
  const [fechaEmisionHasta, setFechaEmisionHasta] = useState("")
  const [fechaVenciDesde, setFechaVenciDesde] = useState("")
  const [fechaVenciHasta, setFechaVenciHasta] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const [searchCobVendedor, setSearchCobVendedor] = useState("")
  const [fechaEmisionDesdeCob, setFechaEmisionDesdeCob] = useState("")
  const [fechaEmisionHastaCob, setFechaEmisionHastaCob] = useState("")

  return (
    <SearchContext.Provider value={
      {clientes, 
        setClientes, 
        searchTerm, 
        setSearchTerm, 
        isLoading, 
        setIsLoading, 
        searchTermVendedor, 
        setSearchTermVendedor, 
        fechaEmisionDesde, 
        setFechaEmisionDesde, 
        fechaEmisionHasta, 
        setFechaEmisionHasta, 
        fechaVenciDesde, 
        setFechaVenciDesde, 
        fechaVenciHasta, 
        setFechaVenciHasta,
        searchCobVendedor, 
        setSearchCobVendedor,
        fechaEmisionDesdeCob, 
        setFechaEmisionDesdeCob,
        fechaEmisionHastaCob, 
        setFechaEmisionHastaCob,
      }
    }>
      {children}
    </SearchContext.Provider>
  )
}

