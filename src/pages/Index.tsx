import { useITSMContext } from "@/contexts/ITSMContext";
import SaveDefaultsButton from "@/components/SaveDefaultsButton";
import ClientPanel from "@/components/itsm/ClientPanel";
import SmartTiersPanel from "@/components/itsm/SmartTiersPanel";
import { Calculator } from "lucide-react";
import SortableNav from "@/components/SortableNav";
import SavePresetButton from "@/components/SavePresetButton";
import UserMenu from "@/components/auth/UserMenu";
import Can from "@/components/auth/Can";
import ParametrosMenu from "@/components/ParametrosMenu";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

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
            <ParametrosMenu />
            <Can permission="pricing.save_preset"><SavePresetButton /></Can>
            <Can permission="params.save_defaults"><SaveDefaultsButton /></Can>
            <SortableNav current="home" />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] p-4">
        <ResizablePanelGroup
          direction="horizontal"
          className="items-start gap-0 min-h-[600px]"
          style={{ height: "auto", overflow: "visible" }}
        >
          <ResizablePanel
            className="sticky top-14 self-start"
            defaultSize={32}
            minSize={22}
            maxSize={50}
            style={{ overflow: "visible" }}
          >
            <div className="pr-2">
              <ClientPanel state={state} update={update} updateFunnel={updateFunnel} results={results} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle className="mx-1" />
          <ResizablePanel defaultSize={68} minSize={50} style={{ overflow: "visible" }}>
            <div className="pl-2">
              <SmartTiersPanel />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
};

export default Index;
