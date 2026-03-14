import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useAnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { clusterApiUrl } from "@solana/web3.js";
import idl from "../../idl/sky_chain.json";

import "@solana/wallet-adapter-react-ui/styles.css";

interface WalletContextState {
  program: Program | null;
  connected: boolean;
}

const WalletContext = createContext<WalletContextState>({
  program: null,
  connected: false,
});

// eslint-disable-next-line react-refresh/only-export-components
export const useWalletContext = () => useContext(WalletContext);

function WalletContextInner({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const contextValue = useMemo<WalletContextState>(() => {
    if (!wallet) {
      return { program: null, connected: false };
    }
    const provider = new AnchorProvider(connection, wallet, {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const program = new Program(idl as any, provider);
    return { program, connected: true };
  }, [connection, wallet]);

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

export function WalletContextProvider({ children }: { children: ReactNode }) {
  const endpoint = clusterApiUrl("devnet");
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContextInner>{children}</WalletContextInner>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
