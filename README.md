# [NOME]

[![CI](https://github.com/Adilla-rgp/meridiano/actions/workflows/ci.yml/badge.svg)](https://github.com/Adilla-rgp/meridiano/actions/workflows/ci.yml)

> Nome provisório. O nome do produto ainda não foi definido e fica num único lugar: `src/config/brand.ts`.

Planejador de viagens em grupo: cada pessoa informa seus limites e preferências, um motor determinístico calcula o plano mais justo e explica quem cedeu o quê.

Este repositório é o front-end. O motor e a API ficam em [Adilla-rgp/meridiano-api](https://github.com/Adilla-rgp/meridiano-api) (Python, FastAPI e PostgreSQL). Projeto de portfólio.

## O problema

Grupos de amigos planejam viagem no WhatsApp, com enquete e planilha. Datas, orçamento e destino entram em conflito e ninguém decide. Quando decidem por votação, a maioria escolhe e alguém fica para trás sem explicação.

## O diferencial

Decisão justa e explicada, não votação:

- **Limites nunca são violados.** "No máximo R$ 1.100" ou "nada de frio" eliminam alternativas antes de qualquer cálculo.
- **O critério de equilíbrio protege quem sairia pior**, em vez de olhar só para a média do grupo.
- **Cada concessão vem com o motivo**, por pessoa: quem ganhou, quem cedeu e por quê.
- **O texto livre só vira sugestão:** "não curto frio, no máximo uns 1.100 conto" é interpretado em restrições estruturadas, que a pessoa confirma antes de salvar. A interpretação fica atrás de uma interface na API: por regras (o padrão) ou por um LLM, medidos no mesmo conjunto de casos. A decisão e a explicação são determinísticas: as mesmas respostas geram sempre o mesmo plano.
- **O orçamento de cada pessoa é confidencial:** entra no cálculo, mas nunca aparece para o grupo.

## Demonstração

<!-- Substituir pelo GIF ou vídeo de 60 s da demonstração. -->
_GIF ou vídeo da demonstração em breve._

<!-- Substituir pelo endereço publicado. -->
Site: _em breve_.

**O site publicado é uma demonstração, sem API.** Ele roda só no navegador, com a "Viagem de julho": 5 pessoas, 4 destinos e 3 respostas. Os planos, scores, justificativas e o mapa de tensões que ele mostra não foram escritos à mão: foram calculados pelo motor real da planner-api para cada etapa da demonstração e exportados para `src/mocks/fixtures/`. O que muda na demonstração é só a entrada: a interpretação do texto livre devolve uma resposta de exemplo por pessoa, e as respostas ficam salvas no `localStorage` do navegador.

**O modo completo roda localmente com a API:** criar viagens, convidar pessoas, interpretar qualquer texto, gerar rodadas pelo motor e fechar a viagem (veja [Como rodar](#como-rodar)).

A página inicial da demonstração traz um roteiro de cinco passos:

1. ver o mapa de tensões com 3 respostas;
2. responder como Eva, em texto livre;
3. voltar ao mapa e ver os conflitos aparecerem;
4. gerar os planos e mexer no critério de equilíbrio (α);
5. reagir ao plano como Eva e ver a reação na tela de quem organiza.

## Como funciona o motor

1. **Interpretar a entrada:** texto livre vira restrições em JSON, que a pessoa confirma.
2. **Normalizar:** limites (orçamento máximo, datas possíveis, climas ou destinos vetados) e preferências com peso (ritmo, clima, destinos preferidos).
3. **Gerar candidatos:** destino × intervalo de datas dentro da janela da viagem.
4. **Filtrar:** descarta todo candidato que viola algum limite.
5. **Pontuar:** satisfação de cada pessoa de 0 a 1, combinada pela fórmula abaixo.
6. **Explicar por regras:** frases geradas a partir dos números, por pessoa.
7. **Nova rodada:** cada um reage (aceito, aceito com ressalva, recuso) e as recusas viram restrições novas.

A pontuação de um plano `p` para `n` pessoas, com `α` entre 0 e 1 (padrão 0,5):

```
score(p) = (1 − α) · média(sᵢ(p)) + α · min(sᵢ(p))
```

Com `α = 0`, vence a maior média do grupo; com `α = 1`, vence o plano em que a pessoa menos atendida fica melhor. Na tela de planos, o controle de α simula essa troca no navegador e reordena as alternativas; o plano recomendado continua sendo o que o motor calculou.

## Stack e arquitetura

- **Front-end (este repositório):** Vite, React 18, TypeScript (strict), Tailwind CSS com tokens próprios, React Router, `tailwind-variants`, `lucide-react` e Vitest.
- **API ([meridiano-api](https://github.com/Adilla-rgp/meridiano-api)):** FastAPI + Pydantic, com o motor como módulo Python puro, PostgreSQL (restrições em JSONB) e a interpretação do texto atrás de uma interface (regras por padrão; LLM opcional). A API informa em `constraint_parser` qual interpretação usa: com `llm`, as telas avisam que o texto passa por um serviço de IA externo.

**Dois modos.** Toda chamada passa por `src/lib/api.ts`, que tem uma função por rota da API:

- **Com `VITE_API_URL`** (por exemplo, `http://localhost:8000`), o front chama a planner-api. Quem organiza cria a viagem em `/viagens/nova` e recebe um link de administração (`…/tensoes#admin=…`); o token fica guardado por viagem no `localStorage`, junto com os links de convite criados neste navegador (`src/lib/tokens.ts`). Quando falta o link de alguém, o front gera um novo pela rota de reemissão, e o anterior deixa de valer.
- **Sem `VITE_API_URL`**, o site roda em modo demonstração: `src/mocks/api.ts` responde no mesmo formato e com as mesmas regras, com dados de exemplo salvos no `localStorage` e um pequeno atraso simulado.

- `docs/especificacao.md`: especificação do produto, modelo de dados e contrato da API.
- `docs/design/`: telas aprovadas (convidado, mapa de tensões, plano e concessões).
- `src/types/api.ts`: tipos do contrato.
- `src/pages/`: uma pasta por tela.
- `src/components/`: componentes compartilhados.
- `src/lib/`: acesso à API, formatação e a simulação do critério de equilíbrio (`scoring.ts`).
- `src/mocks/`: a API de demonstração e os dados de exemplo, com as saídas do motor e do mapa de tensões geradas pela planner-api.
- `src/config/`: nome do produto, endereço da API e modo demonstração.

O front não implementa o motor nem o mapa de tensões: tudo vem pronto da API (no modo demonstração, dos fixtures gerados por ela).

## Como rodar

Requer Node.js 20 ou mais recente.

```bash
npm install
npm run dev
```

Abra o endereço que o Vite mostrar (normalmente `http://localhost:5173`). Sem configuração, o site abre no modo demonstração.

Para o modo completo, suba a [meridiano-api](https://github.com/Adilla-rgp/meridiano-api) (`docker compose up --build` naquele repositório) e crie um `.env.local` a partir de `.env.example`:

```bash
VITE_API_URL=http://localhost:8000
```

A API precisa aceitar a origem do front em `CORS_ORIGINS` (o padrão já inclui `http://localhost:5173`).

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | checagem de tipos e build de produção em `dist/` |
| `npm run preview` | serve o build localmente |
| `npm run typecheck` | checagem de tipos |
| `npm run lint` | ESLint |
| `npm test` | testes unitários (Vitest) |
| `npm run test:e2e` | ponta a ponta no modo demonstração (Playwright) |
| `npm run test:e2e:api` | ponta a ponta contra a API local (Playwright) |

Para voltar os dados de exemplo ao início, use "Reiniciar demonstração" no topo de qualquer tela ou abra qualquer página com `?reset-mocks` no endereço.

## Testes

```bash
npm test
```

Os testes cobrem a fórmula do score e a ordenação das alternativas (`src/lib/scoring.test.ts`), as mensagens de erro da API (`src/lib/http.test.ts`), os tokens guardados (`src/lib/tokens.test.ts`), as regras da API de demonstração (`src/mocks/api.test.ts`) e a coerência dos fixtures com os dados de exemplo.

### Ponta a ponta (Playwright)

Os testes ficam em `e2e/` e falham se aparecer qualquer erro de JavaScript ou do console. Antes da primeira vez, instale o navegador:

```bash
npx playwright install chromium
```

**Contra os dados de exemplo** (`e2e/demo.e2e.ts`, configuração em `playwright.config.ts`). É o que roda no CI:

```bash
npm run test:e2e
```

Gera o build de produção sem `VITE_API_URL`, como o site publicado, mesmo que exista um `.env.local`, e o serve na porta 4173. Percorre o roteiro da demonstração: a página inicial, Eva respondendo no celular (360 px, sem aviso de IA), o conflito no mapa, os planos, a reação de Eva chegando a quem organiza e a rodada sem plano viável depois da resposta de Diego.

**Contra a API local** (`e2e/api.e2e.ts`, configuração em `playwright.api.config.ts`). Roda à mão:

```bash
# no repositório planner-api
docker compose up --build

# neste repositório
npm run test:e2e:api
```

Sobe o front na porta 5173 apontado para `http://localhost:8000` (outro endereço: `E2E_API_URL`). Se a API não responder, o teste para logo, com a instrução. A porta 5173 precisa estar livre, porque é a origem que a API aceita por padrão. O teste faz o ciclo completo, com cada pessoa num navegador separado: criar a viagem, convidar, responder, abrir o link de administração em outro navegador, gerar a rodada 1, recusar e confirmar o motivo, gerar a rodada 2, reagir numa rodada antiga e todos aceitarem até a viagem fechar. Cada execução cria uma viagem nova no banco local.

### CI

O GitHub Actions (`.github/workflows/ci.yml`) roda, em todo push e pull request, `typecheck`, `lint`, os testes unitários, o build e os testes de ponta a ponta contra os dados de exemplo. Quando algo falha, o relatório do Playwright fica nos artefatos da execução.

## Publicação

O projeto está pronto para a Vercel:

- O site publicado fica no modo demonstração: não defina `VITE_API_URL` nas variáveis do projeto. Para publicar com uma API, defina `VITE_API_URL` com o endereço público dela, que precisa ter o domínio do front em `CORS_ORIGINS`.
- `vercel.json` redireciona todas as rotas para o `index.html`, para que recarregar `/viagens/…` ou `/convite/…` funcione.
- As tags Open Graph usam o domínio de produção que a Vercel informa no build (`VERCEL_PROJECT_PRODUCTION_URL`). Em outro provedor, defina `SITE_URL` (por exemplo, `SITE_URL=https://meu-dominio.com`).
- A imagem de prévia fica em `public/og-image.png`, gerada a partir de `scripts/og-image.html`.

## Roadmap

1. Validar a dor com 10 a 15 entrevistas e prototipar as 3 telas principais. **(telas prontas neste front)**
2. Motor de decisão com testes em cenários artificiais.
3. API em FastAPI e integração com este front.
4. Testes com 3 a 5 grupos reais, comparando com a enquete do WhatsApp.
5. Portfólio: deploy, README e vídeo de 60 s. Se houver uso e alguém pagar, vira produto.

Fora do escopo por enquanto: roteiro por dia, replanejamento ao vivo, preços em tempo real, pagamentos, divisão de gastos e app nativo.

## Origem

O projeto começou a partir do layout do plann.er, feito durante o NLW Journey da Rocketseat. Daquele código ficou só o esqueleto (Vite, React, TypeScript, Tailwind, React Router e o padrão de `tailwind-variants`). A interface, o contrato da API, os dados de exemplo e toda a lógica de restrições, tensões e planos foram reescritos do zero para este produto.
