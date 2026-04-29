import { useITSMContext } from "@/contexts/ITSMContext";
import ClientPanel from "@/components/itsm/ClientPanel";
import ResultsPanel from "@/components/itsm/ResultsPanel";
import MetricsPanel from "@/components/itsm/MetricsPanel";
import { Calculator } from "lucide-react";
import SortableNav from "@/components/SortableNav";

const Index = () => {
  const { state, update, updateFunnel, results } = useITSMContext();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-4">
          <Calculator className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-bold text-foreground">Calculadora de Precificação ITSM</h1>
          <div className="ml-auto">
            <SortableNav current="home" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-4">
        <div className="grid gap-4 lg:grid-cols-[280px_1fr_300px]">
          {/* Left Panel - Métricas */}
          <aside className="order-2 lg:order-1">
            <MetricsPanel state={state} results={results} update={update} />
          </aside>

          {/* Center Panel */}
          <section className="order-1 lg:order-2">
            <ClientPanel state={state} update={update} updateFunnel={updateFunnel} results={results} />
          </section>

          {/* Right Panel */}
          <aside className="order-3">
            <ResultsPanel state={state} results={results} />
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Index;
