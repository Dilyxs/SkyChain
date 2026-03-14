import { BrowserRouter, Routes, Route } from "react-router-dom";
import MapPage from "./lib/Map.tsx";
import { WalletConnector } from "./login/WalletConnector.tsx";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapPage />}></Route>
        <Route
          path="/walletconnect"
          element={<WalletConnector></WalletConnector>}
        ></Route>
        <Route></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
