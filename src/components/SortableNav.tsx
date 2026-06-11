import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ClipboardList,
  Users,
  DollarSign,
  TrendingUp,
  Server,
  Clock,
  FolderOpen,
  Activity,
  Menu,
  Check,
  ChevronDown,
  Settings2,
  UsersRound,
  FileText,
  MapPin,
  ServerCog,
  LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ThemeToggle from "@/components/ThemeToggle";
import SaveDefaultsButton from "@/components/SaveDefaultsButton";
import BUMenu from "@/components/BUMenu";
import { useAuth } from "@/contexts/AuthContext";
import type { PermissionKey } from "@/lib/permissions";

export type NavItemId =
  | "home"
  | "taxas"
  | "financeiro"
  | "gestao-ti"
  | "escopo"
  | "equipe-n1"
  | "equipe-n2"
  | "equipe-n3"
  | "field-service"
  | "detalhamento"
  | "precificacoes"
  | "relatorio-demanda"
  | "resumo-cotacao";

interface PageDef {
  id: NavItemId;
  to: string;
  label: string;
  icon: LucideIcon;
}

const PAGES: Record<NavItemId, PageDef> = {
  home: { id: "home", to: "/", label: "Início", icon: Activity },
  taxas: { id: "taxas", to: "/taxas-demanda", label: "Métricas e Parâmetros", icon: TrendingUp },
  financeiro: { id: "financeiro", to: "/financeiro", label: "Financeiro", icon: DollarSign },
  "gestao-ti": { id: "gestao-ti", to: "/gestao-ti", label: "Gestão de TI", icon: ServerCog },
  escopo: { id: "escopo", to: "/escopo", label: "Escopo", icon: ClipboardList },
  "equipe-n1": { id: "equipe-n1", to: "/equipe-n1", label: "Equipe N1", icon: Users },
  "equipe-n2": { id: "equipe-n2", to: "/equipe-n2", label: "Equipe N2", icon: Server },
  "equipe-n3": { id: "equipe-n3", to: "/equipe-n3", label: "Equipe N3", icon: Clock },
  "field-service": { id: "field-service", to: "/field-service", label: "Field Service de Microinformática", icon: MapPin },
  detalhamento: { id: "detalhamento", to: "/detalhamento", label: "Proposição", icon: ClipboardList },
  precificacoes: { id: "precificacoes", to: "/precificacoes", label: "Precificações", icon: FolderOpen },
  "relatorio-demanda": { id: "relatorio-demanda", to: "/relatorio-demanda", label: "Demanda Operacional", icon: FileText },
  "resumo-cotacao": { id: "resumo-cotacao", to: "/resumo-cotacao", label: "Resumo de Cotação", icon: FileText },
};

const PAGE_PERMISSION: Record<NavItemId, PermissionKey> = {
  home: "page.home",
  taxas: "page.taxas_demanda",
  financeiro: "page.financeiro",
  "gestao-ti": "page.gestao_ti",
  escopo: "page.escopo",
  "equipe-n1": "page.equipe_n1",
  "equipe-n2": "page.equipe_n2",
  "equipe-n3": "page.equipe_n3",
  "field-service": "page.field_service",
  detalhamento: "page.detalhamento",
  precificacoes: "page.precificacoes",
  "relatorio-demanda": "page.relatorio_demanda",
  "resumo-cotacao": "page.resumo_cotacao",
};

type SlotId = "menu-equipes" | "menu-config" | "menu-relatorio";

interface MenuSlot {
  kind: "menu";
  id: SlotId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  items: NavItemId[];
}

interface PageSlot {
  kind: "page";
  id: SlotId;
  page: NavItemId;
}

type Slot = MenuSlot | PageSlot;

const SLOTS: Slot[] = [
  {
    kind: "menu",
    id: "menu-config",
    label: "Configurações",
    shortLabel: "Config",
    icon: Settings2,
    items: ["taxas", "financeiro", "gestao-ti", "escopo"],
  },
  {
    kind: "menu",
    id: "menu-equipes",
    label: "Equipes",
    shortLabel: "Equipes",
    icon: UsersRound,
    items: ["equipe-n1", "equipe-n2", "equipe-n3", "field-service"],
  },
  {
    kind: "menu",
    id: "menu-relatorio",
    label: "Relatório",
    shortLabel: "Relatório",
    icon: FileText,
    items: ["detalhamento", "relatorio-demanda", "resumo-cotacao"],
  },
];

const SLOT_MAP = new Map<SlotId, Slot>(SLOTS.map((s) => [s.id, s]));
const ALL_SLOT_IDS: SlotId[] = SLOTS.map((s) => s.id);

const STORAGE_KEY = "nav-order-v2";

function getResponsiveMode(): "mobile" | "icon" | "short" | "full" {
  if (typeof window === "undefined") return "full";
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "icon";
  if (width < 1280) return "short";
  return "full";
}

function loadOrder(): SlotId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ALL_SLOT_IDS;
    const parsed = JSON.parse(raw) as SlotId[];
    const valid = parsed.filter((id) => SLOT_MAP.has(id));
    const missing = ALL_SLOT_IDS.filter((id) => !valid.includes(id));
    return [...valid, ...missing];
  } catch {
    return ALL_SLOT_IDS;
  }
}

interface SortableSlotProps {
  slot: Slot;
  current?: NavItemId;
  display: "full" | "short" | "icon";
}

function SortableSlot({ slot, current, display }: SortableSlotProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.id,
  });
  const navigate = useNavigate();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : ("auto" as const),
  };

  const isMenu = slot.kind === "menu";
  const isCurrent = isMenu
    ? slot.items.includes(current as NavItemId)
    : current === slot.page;

  const Icon = isMenu ? slot.icon : PAGES[slot.page].icon;
  const fullLabel = isMenu ? slot.label : PAGES[slot.page].label;
  const shortLabel = isMenu ? slot.shortLabel : PAGES[slot.page].label;
  const labelText = display === "full" ? fullLabel : display === "short" ? shortLabel : null;

  const innerButton = isMenu ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs h-8 pl-1 pr-2 rounded-l-none"
        >
          <Icon className="h-3.5 w-3.5" />
          {labelText}
          {display !== "icon" && <ChevronDown className="h-3 w-3 opacity-60" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">{slot.label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {slot.items.map((pid) => {
          const p = PAGES[pid];
          const PIcon = p.icon;
          return (
            <DropdownMenuItem
              key={pid}
              onClick={() => navigate(p.to)}
              className="gap-2 text-sm"
            >
              <PIcon className="h-4 w-4" />
              <span className="flex-1">{p.label}</span>
              {current === pid && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : isCurrent ? (
    <div className="flex items-center gap-1.5 text-xs h-8 pl-1 pr-2 font-medium">
      <Icon className="h-3.5 w-3.5" />
      {labelText}
    </div>
  ) : (
    <Link to={PAGES[(slot as PageSlot).page].to}>
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 pl-1 pr-2 rounded-l-none">
        <Icon className="h-3.5 w-3.5" />
        {labelText}
      </Button>
    </Link>
  );

  const content = (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center rounded-md border transition-colors shrink-0 ${
        isCurrent ? "bg-secondary border-secondary" : "bg-background hover:bg-muted/50"
      }`}
    >
      <button
        className="px-1 py-1.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        {...attributes}
        {...listeners}
        aria-label={`Reordenar ${fullLabel}`}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      {innerButton}
    </div>
  );

  if (display === "icon") {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{fullLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return content;
}

interface Props {
  current?: NavItemId;
  extras?: ReactNode;
}

export default function SortableNav({ current, extras }: Props) {
  const [order, setOrder] = useState<SlotId[]>(() => loadOrder());
  const [mode, setMode] = useState<"mobile" | "icon" | "short" | "full">(() => getResponsiveMode());
  const navigate = useNavigate();
  const { can } = useAuth();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  }, [order]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setOrder(loadOrder());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const onResize = () => setMode(getResponsiveMode());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const allowedPage = (pid: NavItemId) => can(PAGE_PERMISSION[pid]);

  const slots = order
    .map((id) => SLOT_MAP.get(id))
    .filter((s): s is Slot => Boolean(s))
    .map((s): Slot | null => {
      if (s.kind === "page") return allowedPage(s.page) ? s : null;
      const items = s.items.filter(allowedPage);
      return items.length ? { ...s, items } : null;
    })
    .filter((s): s is Slot => Boolean(s));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as SlotId);
      const newIndex = prev.indexOf(over.id as SlotId);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const dndContent = (display: "full" | "short" | "icon") => (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={slots.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-1.5 items-center">
          {slots.map((slot) => (
            <SortableSlot key={slot.id} slot={slot} current={current} display={display} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );

  // Mobile: lista plana de páginas
  const mobilePages: NavItemId[] = slots.flatMap((s) =>
    s.kind === "menu" ? s.items : [s.page]
  );

  return (
    <>
      {mode === "mobile" ? (
      <div>
        <div className="inline-flex items-center gap-1">
        <BUMenu />
        {extras}
        <SaveDefaultsButton />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Menu className="h-4 w-4" />
              <span className="text-xs">Menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">Navegação</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {mobilePages.map((pid) => {
              const p = PAGES[pid];
              const Icon = p.icon;
              const isCurrent = current === pid;
              return (
                <DropdownMenuItem key={pid} onClick={() => navigate(p.to)} className="gap-2 text-sm">
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{p.label}</span>
                  {isCurrent && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
      ) : (
      <div className="flex items-center gap-1"><BUMenu />{dndContent(mode)}{extras}<SaveDefaultsButton /><ThemeToggle /></div>
      )}
    </>
  );
}
