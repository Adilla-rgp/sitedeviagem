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
| catalog_destinations | id, name, state, climate, est_cost_per_person, cost_source, tags |
| trips | id, title, organizer_id, date_window_start, date_window_end, alpha, status, created_at |
| trip_destinations | trip_id, destination_id |
| members | id, trip_id, display_name, invite_token, is_organizer, responded_at |
| constraints | id, member_id, raw_text, hard (JSONB), soft (JSONB), confirmed_at, version |
| plans | id, trip_id, round, destination_id, variant_label, start_date, end_date, est_cost_per_person, score, per_member_scores (JSONB), explanation (JSONB) |
| reactions | id, plan_id, member_id, verdict, comment |

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
- **Reações:** o convidado não tem conta, então `POST /plans/{id}/reactions` recebe o `invite_token` em vez de `member_id`.
- **GET /invite/{token}** devolve a viagem, o participante, `organizer_name`, `member_count`, os destinos candidatos e as restrições já salvas (ou nulo).
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
