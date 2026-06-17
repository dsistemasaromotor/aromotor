import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { SearchProvider } from './context/SearchContext'
import EstadoCuenta from './pages/EstadoCuenta'
import MainWrapper from './layouts/MainWrapper'
import PrivateRoute from './layouts/PrivateRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'
import Usuarios from './pages/Usuarios'
import SetPassword from './pages/SetPassword'
import EditarUsuario from './pages/EditarUsuario'
import CrearUsuario from './pages/CrearUsuario'
import Kardex from './pages/Kardex'
import RepValoracionUbicacion from './pages/RepValoracionUbicacion'

function App() {

  return (
    <BrowserRouter>
      <MainWrapper>
        <Routes>
          <Route
            path="/"
            element={
              <PrivateRoute>
                  <Dashboard />
              </PrivateRoute>
            }
          />


          <Route
            path="/kardex"
            element={
              <PrivateRoute>
                  <Kardex/>
              </PrivateRoute>
            }
          />

          <Route
            path="/reporte-valoracion-ubicacion"
            element={
              <PrivateRoute>
                  <RepValoracionUbicacion/>
              </PrivateRoute>
            }
          />

          <Route 
            path="/login" 
            element={
              <Login/>
            }
          />

          <Route 
            path="/estadoCuenta" 
            element={
              <PrivateRoute>
                <SearchProvider>
                  <EstadoCuenta/>
                </SearchProvider>
              </PrivateRoute>  
            } 
          />

          <Route 
            path="*" 
            element={
              <NotFound/>
            }
          />

          <Route 
            path="/usuarios" 
            element={
              <PrivateRoute>
                <Usuarios/>
              </PrivateRoute>
            } 
          />

          <Route 
            path="/set-password" 
            element={
                <SetPassword/>
            } 
          />

          <Route 
            path="/usuarios/editar/:id" 
            element={
              <PrivateRoute>
                <EditarUsuario />
              </PrivateRoute>
            }
          />

          <Route 
            path="/usuarios/crear"  
            element={
              <PrivateRoute>
                <CrearUsuario />
              </PrivateRoute>
            } 
          />

        </Routes>
      </MainWrapper>
    </BrowserRouter>
  )
}

export default App
