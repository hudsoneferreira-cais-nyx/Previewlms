"use client";

import dynamic from "next/dynamic";
import { DataProvider } from "@/lib/data";

// A plataforma depende da sessão do navegador: renderiza só no cliente.
const Platform = dynamic(() => import("@/components/platform").then((m) => m.Platform), { ssr: false });

export default function Home() {
  return (
    <DataProvider>
      <Platform />
    </DataProvider>
  );
}
