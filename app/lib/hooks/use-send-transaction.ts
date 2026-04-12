"use client";

import { useState, useCallback, useMemo } from "react";
import { useSWRConfig } from "swr";
import type { Instruction } from "@solana/kit";
import { createClient } from "@solana/kit-client-rpc";
import { useWallet } from "../wallet/context";
import { useCluster } from "../../components/cluster-context";
import { getClusterUrl, getClusterWsConfig } from "../solana-client";

export function useSendTransaction() {
  const { signer } = useWallet();
  const { cluster } = useCluster();
  const { mutate } = useSWRConfig();
  const [isSending, setIsSending] = useState(false);

  // Stabilize client based on signer address to prevent unnecessary hook re-runs
  const signerAddress = signer?.address;
  const txClient = useMemo(
    () =>
      signer
        ? createClient({
            url: getClusterUrl(cluster),
            rpcSubscriptionsConfig: getClusterWsConfig(cluster),
            payer: signer,
          })
        : null,
    [cluster, signerAddress] 
  );

  const send = useCallback(
    async ({ instructions }: { instructions: readonly Instruction[] }) => {
      if (!txClient) throw new Error("Wallet not connected");

      setIsSending(true);
      try {
        const result = await txClient.sendTransaction([...instructions]);
        mutate((key: unknown) => Array.isArray(key) && key[0] === "balance");
        return result.context.signature;
      } catch (err: any) {
        // Log detailed cause of simulation failure for debugging
        console.error("Advanced transaction error log:", {
          message: err.message,
          cause: err.cause,
          logs: err.logs,
        });
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [txClient, mutate]
  );

  return { send, isSending };
}
