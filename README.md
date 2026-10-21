# [NOME]

> Nome provisório. O nome do produto ainda não foi definido e fica num único lugar: `src/config/brand.ts`.

Planejador de viagens em grupo: cada pessoa informa seus limites e preferências, um motor determinístico calcula o plano mais justo e explica quem cedeu o quê.

## O problema

Grupos de amigos planejam viagem no WhatsApp, com enquete e planilha. Datas, orçamento e destino entram em conflito e ninguém decide. Quando decidem por votação, a maioria escolhe e alguém fica para trás sem explicação.

## O diferencial

Decisão justa e explicada, não votação:

- **Limites nunca são violados.** "No máximo R$ 1.100" ou "nada de frio" eliminam alternativas antes de qualquer cálculo.
- **O critério de equilíbrio protege quem sairia pior**, em vez de olhar só para a média do grupo.
- **Cada concessão vem com o motivo**, por pessoa: quem ganhou, quem cedeu e por quê.
- **A IA só entra na entrada:** transforma texto livre ("não curto frio, no máximo uns 1.100 conto") em restrições estruturadas que a pessoa confirma. A decisão e a explicação são determinísticas: as mesmas respostas geram sempre o mesmo plano.
- **O orçamento de cada pessoa é confidencial:** entra no cálculo, mas nunca aparece para o grupo.

## Demonstração

<!-- Substituir pelo GIF ou vídeo de 60 s da demonstração. -->
_GIF ou vídeo da demonstração em breve._

<!-- Substituir pelo endereço publicado. -->
Site: _em breve_.

O site abre em modo demonstração, com a "Viagem de julho": 5 pessoas, 4 destinos e 3 respostas. A página inicial traz um roteiro de cinco passos:

1. ver o mapa de tensões com 3 respostas;
2. responder como Eva, em texto livre;
3. voltar ao mapa e ver os conflitos aparecerem;
4. gerar os planos e mexer no critério de equilíbrio (α);
5. reagir ao plano como Eva e ver a reação na tela da organizadora.

## Como funciona o motor

1. **Interpretar a entrada (IA):** texto livre vira restrições em JSON, que a pessoa confirma.
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
- **API (próxima fase, repositório separado):** FastAPI + Pydantic, com o motor como módulo Python, PostgreSQL (restrições em JSONB) e um LLM só na rota de interpretação do texto.

**Hoje o front usa dados de exemplo.** Toda chamada passa por `src/lib/api.ts`, que tem uma função por rota do contrato e devolve dados de `src/mocks/` no formato exato da API, com um pequeno atraso simulado. Os dados ficam salvos no `localStorage` do navegador, para a demonstração funcionar entre abas e recargas. Quando a API existir, só `src/lib/api.ts` muda.

- `docs/especificacao.md`: especificação do produto, modelo de dados e contrato da API.
- `docs/design/`: telas aprovadas (convidado, mapa de tensões, plano e concessões).
- `src/types/api.ts`: tipos do contrato.
- `src/pages/`: uma pasta por tela.
- `src/components/`: componentes compartilhados.
- `src/lib/`: acesso à API, formatação e a simulação do critério de equilíbrio (`scoring.ts`).
- `src/mocks/`: dados de exemplo e o cálculo do mapa de tensões, que vai para o back depois.
- `src/config/`: nome do produto e modo demonstração.

O front não implementa o motor: planos e scores vêm prontos da API (hoje, dos mocks). O cálculo do mapa de tensões existe em `src/mocks/tensions.ts` só até a API assumir essa rota.

## Como rodar

Requer Node.js 20 ou mais recente.

```bash
npm install
npm run dev
```

Abra o endereço que o Vite mostrar (normalmente `http://localhost:5173`).

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | checagem de tipos e build de produção em `dist/` |
| `npm run preview` | serve o build localmente |
| `npm run typecheck` | checagem de tipos |
| `npm run lint` | ESLint |
| `npm test` | testes unitários (Vitest) |

Para voltar os dados de exemplo ao início, use "Reiniciar demonstração" no topo de qualquer tela ou abra qualquer página com `?reset-mocks` no endereço.

## Testes

```bash
npm test
```

Os testes cobrem a fórmula do score e a ordenação das alternativas (`src/lib/scoring.test.ts`), inclusive os casos-limite de α (0 e 1) e empates na pior satisfação.

## Publicação

O projeto está pronto para a Vercel:

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
