import { BrowserRouter, Routes, Route } from "react-router-dom";
import MapPage from "./lib/Map.tsx";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/map" element={<MapPage />}></Route>
        <Route></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
