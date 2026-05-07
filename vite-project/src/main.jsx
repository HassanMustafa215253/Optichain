import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";

import './index.css'
import Login from './pages/Login.jsx'
import CentralAdmin from './pages/CentralAdmin.jsx'
import Manager from './pages/Manager.jsx'
import Admin from './pages/Admin/Admin.jsx'
import Finance from './pages/Finance.jsx'
import Worker from './pages/Worker.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/CentralAdmin" element={<CentralAdmin />} />
          <Route path="/Manager" element={<Manager />} />
          <Route path="/Admin" element={<Admin />} />
          <Route path="/Finance" element={<Finance />} />
          <Route path="/Worker" element={<Worker />} />
        </Routes>
      </BrowserRouter>
  </StrictMode>

)
