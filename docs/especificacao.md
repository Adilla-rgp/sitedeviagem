# Especificação do produto — planejador de viagens em grupo

Versão de 20/10/2026. A fonte completa e atualizada é o documento no Claude; este arquivo é a cópia de trabalho para o repositório.

## Visão

Um planejador de viagens em grupo que transforma as restrições de cada pessoa em um plano equilibrado e explica quem cedeu o quê. Nasce como projeto de portfólio, desenhado para poder virar produto.

- **Problema:** grupos planejam no WhatsApp, com enquete e planilha. Datas, orçamento e destino entram em conflito e ninguém decide.
- **Público inicial:** grupos de 3 a 8 amigos jovens, com orçamento apertado, viajando pelo Brasil.
- **Diferencial:** concorrentes (WePlanify, Trips Together, MonkeyTravel) resolvem consenso com votação. Aqui o sistema calcula o plano que respeita os limites de cada um, protege quem sairia mais prejudicado e explica por quê.
- **Onde entra a IA:** na entrada. Texto livre ("não curto frio, no máximo uns 800 conto") vira restrições estruturadas que o convidado confirma. Decisão e explicação são determinísticas.

## Fluxo principal

1. Organizador cria a viagem: 2 a 4 destinos do catálogo e uma janela de datas.
2. Organizador envia o link de convite.
3. Cada convidado responde pelo celular, sem cadastro, em texto livre ou formulário. A IA interpreta e o convidado confirma.
4. O motor gera até 3 alternativas e recomenda a mais justa.
5. Todos veem o plano, a satisfação de cada um e a justificativa.
6. Cada um reage: aceito, aceito com ressalva ou recuso. Recusas viram restrições novas e o motor roda outra rodada até todos aceitarem.

## Escopo do MVP

**Dentro**

- Catálogo limitado de destinos brasileiros, com custo estimado por pessoa e fonte da estimativa
- Criação de viagem com 2 a 4 destinos e janela de datas
- Convite por link, até 8 pessoas, sem cadastro para convidados
- Restrições em texto livre ou formulário, com confirmação da interpretação da IA
- Motor determinístico: até 3 alternativas, recomenda a mais justa
- Justificativa por regras, por pessoa
- Reações e novas rodadas
- Conta só para o organizador (login por link mágico)

**Fora por enquanto:** roteiro por dia, replanejamento ao vivo, recomendador BERT4Rec, preços em tempo real, pagamentos e afiliados, divisão de gastos, app nativo.

## Motor de plano

Determinístico: as mesmas restrições geram sempre o mesmo plano e a mesma explicação. O LLM nunca decide.

1. **Interpretar a entrada (IA):** texto livre → restrições em JSON validadas. O convidado confirma.
2. **Normalizar:** limites (orçamento máximo, datas impossíveis, "não quero") e preferências com peso (ritmo, clima, destinos preferidos).
3. **Gerar candidatos:** destino × intervalo de datas dentro da janela.
4. **Filtrar:** descarta candidatos que violam qualquer limite. Se nada sobra, aponta a restrição que mais bloqueia.
5. **Pontuar:** satisfação por pessoa de 0 a 1, combinada pela fórmula abaixo.
6. **Explicar por regras:** templates a partir dos números (quem ganhou, quem cedeu, quanto e por quê).
7. **Nova rodada:** recusas viram restrições novas.

Pontuação de um plano `p` para `n` pessoas, com `α` entre 0 e 1 (padrão 0,5):

```
score(p) = (1 − α) · média(s_i(p)) + α · min(s_i(p))
```

`α = 0` favorece a média; `α = 1` protege quem sai pior.

### Decisões do motor (21/10/2026)

A implementação de referência fica no repositório `planner-api`, no pacote `engine/`. Os testes de lá cobrem cada regra abaixo.

**Duração.** O organizador fixa a duração ao criar a viagem (`trips.nights`, padrão 6). Para cada destino, o motor testa o roteiro padrão e um "roteiro curto" com 2 noites a menos (no mínimo 2 noites). O dia da volta é o dia da ida mais `nights`.

**Custo.** Cada destino do catálogo tem `fixed_cost` (passagem de ida e volta) e `nightly_cost` (hospedagem e gastos por noite). O custo de um plano é `fixed_cost + noites × nightly_cost`. O `est_cost_per_person` de um destino na API é calculado com o `nights` da viagem. O limite de orçamento é comparado sempre com o custo total; `all_inclusive` só muda o texto do resumo.

**Ritmo do destino.** O catálogo tem o campo `pace` (`relaxed`, `balanced` ou `intense`), definido à mão.

**Satisfação.** Para cada pessoa e candidato:

```
s_i = (Σ w_k · m_k / Σ w_k) · fator de duração
```

A média só considera as preferências que a pessoa declarou. O que ela não mencionou é neutro (0,5), fica fora da média e nunca aparece como concessão.

| Termo | Peso | `m` |
| --- | --- | --- |
| `prefer_destination` | o declarado | 1 para o primeiro da lista, 0,75 para outro destino listado, 0,4 para destino não listado (destino vetado é limite e nem chega aqui) |
| `prefer_tags` | o declarado | fração das tags pedidas que o destino tem; nenhuma = 0 |
| `prefer_climate` | o declarado | `1 − \|preferência − destino\|`, com quente = 0, ameno = 0,5, frio = 1; com mais de um clima pedido, vale o mais próximo |
| `pace` | o declarado | `1 − \|preferência − destino\|`, com tranquilo = 0, equilibrado = 0,5, agitado = 1 |
| folga no orçamento (só para quem tem limite) | 0,5 | `0,5 + 0,5 · clamp((B − custo) / (0,2 · B), 0, 1)`: de 0,5, quando o plano cabe no limite, a 1, com folga de 20% ou mais |

O **fator de duração** vale 1 no roteiro padrão. No roteiro curto, vale `1 − 0,3 · noites perdidas / trips.nights` (0,9 com 6 noites) e se aplica a todos, porque a duração foi escolhida para o grupo. Ele é fator e não termo da média para que perder dias nunca aumente a satisfação de ninguém.

**Quem não declarou preferências** fica com satisfação 0,5 e fora do score do plano (média e mínimo). Na saída, essa pessoa aparece com `has_preferences = false`. O termo de orçamento não conta como preferência declarada.

**Score.** `score(p) = (1 − α) · média(s_i) + α · min(s_i)`, só com quem tem preferências. Se ninguém tiver preferências, o score é 0 em todos os planos e a ordem sai só do desempate.

**Escolha das alternativas.** A satisfação não depende do dia de ida, então cada destino e variante usa o primeiro dia viável. As alternativas são ordenadas pelo score arredondado em 4 casas. Em caso de empate, vem primeiro o roteiro padrão, depois o menor custo e depois o id do destino. O motor devolve até 3. `alternatives_evaluated` é o número de candidatos gerados (destino × variante × dia de ida).

**Melhor possível.** Cada satisfação vem com `best_possible`: a maior satisfação que a pessoa teria em qualquer candidato que respeita os limites de todo o grupo. Isso mostra quanto da concessão é imposta pelos limites dos outros e quanto é escolha do plano.

**Destinos excluídos.** A rodada devolve `excluded_destinations` com cada destino da viagem que não aparece nas alternativas e o motivo:

- `limit`: nenhum candidato do destino respeita os limites. Traz os limites que ferem todos os candidatos; se o destino cai por uma combinação de limites, traz os que, retirados sozinhos, liberariam algum candidato; senão, todos os envolvidos. Cada limite aparece só como tipo e participante, nunca com o valor.
- `lower_score`: viável, com score menor. Traz o melhor score entre as variantes do destino.

**Sem plano viável.** O motor aponta o limite que, retirado sozinho, liberaria mais candidatos. Em caso de empate, usa o limite que aparece em mais violações. O formato dessa resposta na API ainda precisa ser definido. Ela não pode usar o `summary` de um limite de orçamento, porque o resumo traz o valor.

**Justificativas.** São geradas por regras a partir dos mesmos termos da satisfação, em frases completas e sem supor gênero:

- "Ganhou …": até 2 preferências declaradas com `m ≥ 0,75`. Quando a pessoa ganha o destino que indicou, tags e clima viram complemento dele ("Ganhou o destino que indicou, com praia.").
- "Abriu mão …": até 2 itens, primeiro os dias perdidos ("de 2 dias de viagem") e depois as preferências declaradas com `m` abaixo de 0,5 ("do destino que indicou", "de um destino de serra", "do ritmo agitado que pediu").
- Orçamento em três faixas ("cabe no orçamento com folga", "com pouca folga" e "mas no limite"), nunca com o valor.

**Limitações conhecidas.**

- *Duração:* só existem duas durações, as noites fixadas pelo organizador e o roteiro curto com 2 a menos. O motor não testa roteiros mais longos nem durações intermediárias, e ninguém informa a duração que prefere. Quem só consegue viajar 3 dias, com 6 noites fixadas, elimina todos os candidatos.
- *Custo* linear por noite, sem variação por data nem por tamanho do grupo.
- *Datas* não afetam a satisfação: entre os dias viáveis, vale sempre o primeiro, mesmo quando outro deixaria mais folga nas datas de alguém.

## Arquitetura

- **Front-end:** Vite, React, TypeScript, Tailwind. Deploy na Vercel. (Este repositório.)
- **API:** FastAPI + Pydantic, deploy no Render ou Railway. (Repositório separado, fase seguinte.)
- **Banco:** PostgreSQL, restrições em JSONB.
- **Motor:** módulo Python dentro da API.
- **LLM:** Gemini ou Claude API, usado só na rota de parse.
- **E-mail:** serviço transacional para o link mágico.

## Modelo de dados

| Tabela | Campos principais |
| --- | --- |
| catalog_destinations | id, name, state, climate, pace, fixed_cost, nightly_cost, cost_source, tags |
| trips | id, title, organizer_id, date_window_start, date_window_end, nights, alpha, status, created_at |
| trip_destinations | trip_id, destination_id |
| members | id, trip_id, display_name, invite_token, is_organizer, responded_at |
| constraints | id, member_id, raw_text, hard (JSONB), soft (JSONB), confirmed_at, version |
| plans | id, trip_id, round, destination_id, variant_label, start_date, end_date, est_cost_per_person, score, alpha, alternatives_evaluated, violated_limits, per_member_scores (JSONB), explanation (JSONB) |
| reactions | id, plan_id, member_id, verdict, comment, reacted_at |

`status` da viagem: `collecting` → `planned` → `agreed`.

## API (contrato que o front deve seguir)

| Método | Rota | Quem | Faz |
| --- | --- | --- | --- |
| POST | /auth/magic-link | organizador | Envia link de login |
| GET | /destinations | todos | Catálogo de destinos |
| POST | /trips | organizador | Cria viagem |
| GET | /trips/{id} | organizador | Viagem, membros e status das respostas |
| GET | /trips/{id}/tensions | organizador | Pares compatíveis ou em conflito, principais restrições e viabilidade por destino |
| POST | /trips/{id}/members | organizador | Gera convites |
| GET | /invite/{token} | convidado | Dados da viagem para responder |
| POST | /invite/{token}/constraints/parse | convidado | IA interpreta texto livre (não salva) |
| PUT | /invite/{token}/constraints | convidado | Salva restrições confirmadas |
| POST | /trips/{id}/plans | organizador | Roda o motor e gera a rodada |
| GET | /trips/{id}/plans?round=n | ambos | Planos, scores e justificativas |
| POST | /plans/{id}/reactions | convidado | Reage ao plano (identificado pelo `invite_token`) |

Os tipos exatos estão em `src/types/api.ts`. Detalhes acrescentados durante a implementação do front:

- **members.is_organizer:** marca quem organiza, para a interface dizer "Ana convidou você" e "Ana · você".
- **Itens de restrição (`hard` e `soft`):** cada item tem `id`, `kind`, os valores estruturados e um `summary`, uma frase pronta para exibição gerada pela API ("Até R$ 1.100 por pessoa, tudo incluso").
- **plans.variant_label:** nome de uma variante do mesmo destino ("roteiro curto"); nulo no roteiro padrão. **plans.est_cost_per_person:** custo estimado do plano por pessoa.
- **plans.alpha, alternatives_evaluated, violated_limits:** o α que o motor usou, quantas alternativas avaliou na rodada e quantos limites o plano viola (sempre zero nos planos devolvidos).
- **Rodadas:** `GET /trips/{id}` e `GET /invite/{token}` trazem `latest_round` (nulo antes da primeira). `GET /trips/{id}/plans?round=n` devolve `plans` (do maior para o menor score), `recommended_plan_id` e `reactions`; o organizador recebe todas as reações, o convidado só a própria. Rodada inexistente responde 404. `POST /trips/{id}/plans` exige pelo menos 2 respostas.
- **Reações:** o convidado não tem conta, então `POST /plans/{id}/reactions` recebe o `invite_token` em vez de `member_id`. Reagir de novo ao mesmo plano substitui a reação anterior. O comentário é obrigatório em "aceito com ressalva" e "recuso"; o motivo da recusa vira restrição na rodada seguinte.
- **Justificativas** nunca citam o valor do orçamento de alguém, porque ele é confidencial.
- **GET /invite/{token}** devolve a viagem, o participante, `organizer_name`, `member_count`, os destinos candidatos, as restrições já salvas (ou nulo), `latest_round` e `members` (id, nome, se organiza e se respondeu; nunca os tokens de convite dos outros).
- **GET /trips/{id}/tensions** devolve, considerando só quem já respondeu:
  - `pairs`: cada par de participantes com `status` (`compatible` ou `conflict`) e, no conflito, o `criterion` principal (`dates`, `budget`, `climate` ou `pace`, nessa ordem de prioridade);
  - `key_constraints`: as principais restrições, cada uma com `id` e `summary`;
  - `viability`: para cada destino, `accepted_count` de `responded_count`;
  - `most_restrictive_member_id`: quem tem pelo menos 2 limites e estritamente mais que todos os outros (nulo se ninguém).
- **Regras de conflito do mapa:** datas, quando dois limites de data têm menos de 4 dias em comum; orçamento ou clima, quando o limite de um elimina um destino que o outro prefere; ritmo, quando um prefere tranquilo e outro agitado, ambos com peso de pelo menos 0,8.

## Roadmap

1. Semana 1: validar a dor (10 a 15 entrevistas) e prototipar as 3 telas principais.
2. Semanas 2 e 3: motor de decisão com testes em cenários artificiais.
3. Semanas 4 e 5: API e site.
4. Semana 6: testar com 3 a 5 grupos reais, comparando com a enquete do WhatsApp.
5. Depois: portfólio (deploy, README, vídeo de 60 s). Se houver uso e alguém pagar, vira produto.
