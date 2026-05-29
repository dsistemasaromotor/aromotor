import { useEffect, useState } from 'react';
import NavBar from '../components/NavBar/NavBar'
import {ReporteCobranzasTable} from '../components/ReporteCobranzasTable/ReporteCobranzasTable';
import SearchBarCobranzas from '../components/SearchBar/SearchBarCobranzas';
import { useSearch } from '../hooks/useSearch'
import axios from 'axios'


const apiUrl = import.meta.env.VITE_API_URL;

const consultar = async (term, termVendedor, emisionDesde, emisionHasta, venciDesde, venciHasta) => {
    try {
      setIsLoading(true)
      if(perfil === 3){
        const response = await axios.get(`${apiUrl}obtener-cxc/?cliente=${term}&comercial=${fullName}&emision_desde=${emisionDesde}&emision_hasta=${emisionHasta}&vencimiento_desde=${venciDesde}&vencimiento_hasta=${venciHasta}`, {})
        setClientes(response.data)
      }else{
        const response = await axios.get(`${apiUrl}obtener-cxc/?cliente=${term}&comercial=${termVendedor}&emision_desde=${emisionDesde}&emision_hasta=${emisionHasta}&vencimiento_desde=${venciDesde}&vencimiento_hasta=${venciHasta}`, {})
        setClientes(response.data)
      }
    } catch (error) {
      console.error("Error al obtener datos:", error)
    } finally {
      setIsLoading(false)
    }
  }

const Cobranzas = () => {
    const [data, setData] = useState({});
useEffect(() => {
    const fetchData = async () => {
        
        const response = await fetch('http://127.0.0.1:8000/api/rep-final/');
        if (!response.ok) {
          throw new Error('Error al obtener los datos');
        }
        const result = await response.json();
        setData(result);
      
    };

    fetchData();
  }, []); 
  
    return(
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <NavBar/>
            <main className="max-w-full mx-auto px-6 py-8">
                <SearchBarCobranzas consultar={consultar}/>
                Presupuestpo de Cobranzas
                <ReporteCobranzasTable data={data}/>
            </main>
        </div>
    )
}

export default Cobranzas;
