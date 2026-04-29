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
import { GripVertical, ClipboardList, Users, DollarSign, TrendingUp, Server, Clock, LucideIcon } from "lucide-react";

export type NavItemId = "home" | "taxas" | "financeiro" | "equipe-n1" | "equipe-n2" | "equipe-n3" | "detalhamento";

interface NavDef {
  id: NavItemId;
  to: string;
  label: string;
  icon: LucideIcon;
}

const ALL_ITEMS: NavDef[] = [
  { id: "taxas", to: "/taxas-demanda", label: "Taxas de Demanda", icon: TrendingUp },
  { id: "financeiro", to: "/financeiro", label: "Financeiro", icon: DollarSign },
  { id: "equipe-n1", to: "/equipe-n1", label: "Equipe N1", icon: Users },
  { id: "equipe-n2", to: "/equipe-n2", label: "Equipe N2", icon: Server },
  { id: "equipe-n3", to: "/equipe-n3", label: "Equipe N3", icon: Clock },
  { id: "detalhamento", to: "/detalhamento", label: "Detalhamento", icon: ClipboardList },
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

function SortableButton({ item, exclude }: { item: NavDef; exclude?: NavItemId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (item.id === exclude) {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center">
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5 text-xs cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
          <item.icon className="h-3.5 w-3.5" />
          {item.label}
        </Button>
      </div>
    );
  }

  const Icon = item.icon;
  return (
    <div ref={setNodeRef} style={style} className="flex items-center">
      <div className="flex items-center rounded-md border bg-background hover:bg-muted/50 transition-colors">
        <button
          className="px-1 py-1.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          aria-label="Reordenar"
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <Link to={item.to}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 pl-1 pr-2 rounded-l-none">
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Button>
        </Link>
      </div>
    </div>
  );
}

interface Props {
  /** id of the current page — rendered as a non-link visual indicator but still draggable */
  current?: NavItemId;
}

export default function SortableNav({ current }: Props) {
  const [order, setOrder] = useState<NavItemId[]>(() => loadOrder());

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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex flex-wrap gap-2 items-center">
          {items.map((item) => (
            <SortableButton key={item.id} item={item} exclude={current} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
