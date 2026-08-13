import { BookOpen } from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { GLOSSARIO_SD } from "@/lib/servicedesk/glossario";

/** Card de glossário: explica todas as siglas e termos do Smart Service Desk. */
export default function GlossarioSD() {
  return (
    <Card className="mx-auto max-w-6xl">
      <CardContent className="py-1">
        <Accordion type="single" collapsible>
          <AccordionItem value="glossario" className="border-none">
            <AccordionTrigger className="py-3 text-sm">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" aria-hidden />
                Glossário de termos e siglas
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <dl className="grid gap-3 md:grid-cols-2">
                {GLOSSARIO_SD.map((t) => (
                  <div key={t.sigla} className="rounded-md border p-3">
                    <dt className="text-xs font-semibold">
                      {t.sigla} <span className="font-normal text-muted-foreground">— {t.titulo}</span>
                    </dt>
                    <dd className="mt-1 text-xs text-muted-foreground">{t.descricao}</dd>
                  </div>
                ))}
              </dl>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
