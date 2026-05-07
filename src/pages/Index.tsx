import { useITSMContext } from "@/contexts/ITSMContext";
import SaveDefaultsButton from "@/components/SaveDefaultsButton";
import ClientPanel from "@/components/itsm/ClientPanel";
import SmartTiersPanel from "@/components/itsm/SmartTiersPanel";
import { Calculator } from "lucide-react";
import SortableNav from "@/components/SortableNav";
import SavePresetButton from "@/components/SavePresetButton";

const Index = () => {
  const { state, update, updateFunnel, results } = useITSMContext();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-4">
          <div className="flex items-center gap-2 min-w-0">
            <Calculator className="h-5 w-5 text-primary shrink-0" />
            <h1 className="font-bold text-foreground truncate text-base">Smart ITO</h1>
          </div>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SavePresetButton />
            <SaveDefaultsButton />
            <SortableNav current="home" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 items-start">
          <ClientPanel state={state} update={update} updateFunnel={updateFunnel} results={results} />
          <SmartTiersPanel />
        </div>
      </main>
    </div>
  );
};

export default Index;
