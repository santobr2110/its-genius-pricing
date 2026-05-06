import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { useNavigate } from "react-router-dom";

export type NavItemId = "home" | "taxas" | "financeiro" | "equipe-n1" | "equipe-n2" | "equipe-n3" | "detalhamento" | "precificacoes";

interface NavDef {
  id: NavItemId;
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

const ALL_ITEMS: NavDef[] = [
  { id: "taxas", to: "/taxas-demanda", label: "Taxas de Demanda", shortLabel: "Taxas", icon: TrendingUp },
  { id: "financeiro", to: "/financeiro", label: "Financeiro", shortLabel: "Financeiro", icon: DollarSign },
  { id: "equipe-n1", to: "/equipe-n1", label: "Equipe N1", shortLabel: "N1", icon: Users },
  { id: "equipe-n2", to: "/equipe-n2", label: "Equipe N2", shortLabel: "N2", icon: Server },
  { id: "equipe-n3", to: "/equipe-n3", label: "Equipe N3", shortLabel: "N3", icon: Clock },
  { id: "detalhamento", to: "/detalhamento", label: "Detalhamento", shortLabel: "Detalhes", icon: ClipboardList },
  { id: "precificacoes", to: "/precificacoes", label: "Precificações", shortLabel: "Salvas", icon: FolderOpen },
];

const STORAGE_KEY = "nav-order-v1";

function loadOrder(): NavItemId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ALL_ITEMS.map((i) => i.id);
    const parsed = JSON.parse(raw) as NavItemId[];
    const valid = parsed.filter((id) => ALL_ITEMS.some((i) => i.id === id));
    const missing = ALL_ITEMS.map((i) => i.id).filter((id) => !valid.includes(id));
    return [...valid, ...missing];
  } catch {
    return ALL_ITEMS.map((i) => i.id);
  }
}

interface SortableButtonProps {
  item: NavDef;
  isCurrent: boolean;
  /** "full" = ícone + label completo, "short" = ícone + label curto, "icon" = só ícone */
  display: "full" | "short" | "icon";
}

function SortableButton({ item, isCurrent, display }: SortableButtonProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as const,
  };

  const Icon = item.icon;
  const labelText = display === "full" ? item.label : display === "short" ? item.shortLabel : null;

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
        aria-label={`Reordenar ${item.label}`}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      {isCurrent ? (
        <div className="flex items-center gap-1.5 text-xs h-8 pl-1 pr-2 font-medium">
          <Icon className="h-3.5 w-3.5" />
          {labelText}
        </div>
      ) : (
        <Link to={item.to}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 pl-1 pr-2 rounded-l-none">
            <Icon className="h-3.5 w-3.5" />
            {labelText}
          </Button>
        </Link>
      )}
    </div>
  );

  // Quando só ícone, envolve em tooltip pra acessibilidade
  if (display === "icon") {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{item.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return content;
}

interface Props {
  current?: NavItemId;
}

export default function SortableNav({ current }: Props) {
  const [order, setOrder] = useState<NavItemId[]>(() => loadOrder());
  const navigate = useNavigate();

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const items = order
    .map((id) => ALL_ITEMS.find((i) => i.id === id))
    .filter((i): i is NavDef => Boolean(i));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as NavItemId);
      const newIndex = prev.indexOf(over.id as NavItemId);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const dndContent = (display: "full" | "short" | "icon") => (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-1.5 items-center">
          {items.map((item) => (
            <SortableButton key={item.id} item={item} isCurrent={current === item.id} display={display} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );

  return (
    <>
      {/* Mobile: dropdown menu (sem reordenação — apenas navegação) */}
      <div className="md:hidden">
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
            {items.map((item) => {
              const Icon = item.icon;
              const isCurrent = current === item.id;
              return (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => navigate(item.to)}
                  className="gap-2 text-sm"
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {isCurrent && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tablet (md): só ícones com tooltip */}
      <div className="hidden md:block lg:hidden">{dndContent("icon")}</div>

      {/* Desktop estreito (lg): label curto */}
      <div className="hidden lg:block xl:hidden">{dndContent("short")}</div>

      {/* Desktop largo (xl+): label completo */}
      <div className="hidden xl:block">{dndContent("full")}</div>
    </>
  );
}
