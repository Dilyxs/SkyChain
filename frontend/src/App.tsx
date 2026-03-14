import { BrowserRouter, Routes, Route } from "react-router-dom";
import MapPage from "./lib/Map.tsx";
import { WalletConnector } from "./login/WalletConnector.tsx";
import { WalletContextProvider } from "./login/WalletContextProvider.tsx";

function App() {
  return (
    <WalletContextProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MapPage />}></Route>
          <Route path="/walletconnect" element={<WalletConnector />}></Route>
        </Routes>
      </BrowserRouter>
    </WalletContextProvider>
  );
}

export default App;
