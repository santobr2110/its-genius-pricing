import { useITSMContext } from "@/contexts/ITSMContext";
import ClientPanel from "@/components/itsm/ClientPanel";
import ResultsPanel from "@/components/itsm/ResultsPanel";
import { Calculator } from "lucide-react";
import SortableNav from "@/components/SortableNav";

const Index = () => {
  const { state, update, updateFunnel, results } = useITSMContext();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-4">
          <div className="flex items-center gap-2 min-w-0">
            <Calculator className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Calculadora de Precificação ITSM</h1>
          </div>
          <div className="ml-auto shrink-0 pl-2">
            <SortableNav current="home" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section>
            <ClientPanel state={state} update={update} updateFunnel={updateFunnel} results={results} />
          </section>
          <aside>
            <ResultsPanel state={state} results={results} />
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Index;
