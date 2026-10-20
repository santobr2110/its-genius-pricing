import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { descricao } = await req.json();
    if (!descricao || typeof descricao !== "string") {
      return new Response(JSON.stringify({ error: "descricao é obrigatória" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (descricao.length > 10000) {
      return new Response(JSON.stringify({ error: "descricao muito longa (máx 10000 caracteres)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: kb } = await supabase
      .from("base_conhecimento")
      .select("tipo, conteudo_texto")
      .eq("user_id", user.id);

    const cargosTxt = (kb ?? [])
      .filter((r: any) => r.tipo === "cargos_salarios")
      .map((r: any) => r.conteudo_texto ?? "")
      .join("\n");
    const descTxt = (kb ?? [])
      .filter((r: any) => r.tipo === "descritivos")
      .map((r: any) => r.conteudo_texto ?? "")
      .join("\n\n");

    if (!cargosTxt) {
      return new Response(JSON.stringify({ error: "Carregue a tabela de cargos e salários antes de usar a IA." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ausente" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const systemPrompt = `Você é um especialista em cargos e carreiras de TI da Selbetti.

Estrutura interna de cargos (IMPORTANTE):
- Cada cargo tem um "Nível" interno de 1 a 6 que corresponde à senioridade de mercado:
  Nível 1 = Júnior, Nível 2 = Pleno, Nível 3 = Sênior, Nível 4 = Especialista, Nível 5 = Coordenador, Nível 6 = Gerente.
- Cada Nível possui faixas salariais C1..C6 — estas NÃO representam senioridade, e sim a posição do colaborador dentro da faixa (momento de carreira, desempenho, tempo no nível).
- A tabela informada lista, para cada cargo + nível, os valores de cada faixa C1..C6.

Sua tarefa:
1. Analise a descrição da vaga (responsabilidades, stack, complexidade, autonomia esperada).
2. Escolha o cargo mais aderente da tabela.
3. Escolha o Nível interno (1..6) e a senioridade de mercado correspondente.
4. Sugira a faixa C1..C6 inicial mais adequada (padrão razoável = C3, meio da faixa).
5. Use como salario_base o valor exato dessa célula (cargo + nível + faixa) da tabela.

Retorne EXCLUSIVAMENTE um JSON válido, sem texto adicional, com a estrutura:
{
  "cargo_identificado": string,
  "area": string,
  "nivel_num": number,           // 1..6
  "nivel_senioridade": string,   // Júnior/Pleno/Sênior/Especialista/Coordenador/Gerente
  "faixa": string,               // "C1".."C6"
  "salario_base": number,        // valor da célula correspondente
  "justificativa": string,
  "competencias_chave": string[],
  "indice_aderencia": number      // 0..100
}`;

    const userPrompt = `### TABELA DE CARGOS E SALÁRIOS\n${cargosTxt.slice(0, 20000)}\n\n### DESCRITIVOS DE CARGOS\n${descTxt.slice(0, 20000)}\n\n### DESCRIÇÃO DA VAGA\n${descricao.slice(0, 10000)}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em alguns instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos no workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "Erro ao processar IA. Tente novamente." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiResp.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("precificacao-ia error", e);
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});