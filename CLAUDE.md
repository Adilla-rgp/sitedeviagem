# CLAUDE.md

Contexto permanente para agentes de código neste repositório.

## O projeto

Planejador de viagens em grupo: cada participante informa limites e preferências, um motor determinístico calcula o plano mais justo e explica quem cedeu o quê. Projeto de portfólio com potencial de virar produto.

- Especificação completa: `docs/especificacao.md`. Leia antes de qualquer tarefa nova.
- Referência visual aprovada: `docs/design/` (veja abaixo).
- Nome do produto: Meridiano. Na interface ele vem sempre de `src/config/brand.ts`, nunca escrito direto num componente. O `index.html` recebe o nome no build, por `vite.config.ts`.
- Repositórios: este front é `Adilla-rgp/meridiano`; a API é `Adilla-rgp/meridiano-api`.

## Origem do repositório

O projeto nasceu do plann.er do NLW Journey (Rocketseat). A interface antiga já foi totalmente removida; do código original ficou só o esqueleto: Vite, React, TypeScript, Tailwind, React Router e o padrão de `tailwind-variants`.

## Stack

- Vite + React 18 + TypeScript (strict)
- Vitest para testes unitários
- Tailwind CSS 3 com tokens próprios (abaixo)
- React Router 6
- `tailwind-variants` para variantes de componentes
- `lucide-react` para ícones (traço, sem preenchimento)
- Back-end no repositório `meridiano-api` (FastAPI). Todos os dados vêm de `src/lib/api.ts`: com `VITE_API_URL` definida, ele chama a API; sem ela, usa a API de demonstração (`src/mocks/api.ts`), no **formato exato do contrato**.

## Regras de arquitetura

- Componentes nunca contêm dados fixos de negócio: tudo passa por `src/lib/api.ts`.
- Tipos do contrato em `src/types/api.ts`, espelhando os modelos da especificação.
- Dados de exemplo em `src/mocks/`, coerentes entre si (mesmo grupo, mesmos números em todas as telas).
- O front não implementa o motor nem o mapa de tensões: tudo vem pronto da API (no modo demonstração, de `src/mocks/fixtures/`, gerado pela meridiano-api; veja `src/mocks/README.md`). A única pontuação no front é a simulação do critério de equilíbrio em `src/lib/scoring.ts`, que reordena as alternativas quando o organizador mexe no α; ela espelha a fórmula da especificação e não muda o plano recomendado.
- Modo demonstração: sem `VITE_API_URL`, `src/config/demo.ts` liga a faixa "Demonstração com dados de exemplo" em todas as telas e o roteiro da página inicial. Os atalhos e o reinício dos dados ficam em `src/lib/demo.ts`.
- Tokens da API (administração e convites) ficam guardados por viagem no `localStorage` (`src/lib/tokens.ts`). O de administração chega pelo `#admin=` do link e sai da barra de endereço.
- Os dados de exemplo ficam salvos no `localStorage` (`src/mocks/store.ts`). Ao mudar o formato dos dados, suba a versão da chave de armazenamento.
- O orçamento de cada pessoa é confidencial: nenhuma tela ou justificativa mostra o valor para o grupo.
- Estrutura de pastas: `src/pages/` (uma pasta por tela), `src/components/` (compartilhados), `src/lib/`, `src/types/`, `src/mocks/`, `src/config/`.
- Nomes de código, arquivos e funções em inglês. Texto da interface em português do Brasil.

## Identidade visual

Tema escuro, sóbrio e técnico. Deve transmitir credibilidade: uma ferramenta que calcula com rigor, não um app de viagem casual.

| Token | Valor | Uso |
| --- | --- | --- |
| `bg` | `#0E0D12` | fundo da página |
| `surface` | `#17151E` | cartões |
| `surface-sunken` | `#131119` | painéis principais |
| `surface-raised` | `#1E1A2B` | item selecionado, nós do mapa |
| `line` | `#2A2733` | bordas de cartão |
| `line-strong` | `#3A3645` | bordas de botão secundário e campos |
| `line-subtle` | `#211F29` | divisórias de lista |
| `ink` | `#EDEBF2` | texto principal |
| `ink-soft` | `#D6D3DE` | texto de apoio importante |
| `ink-muted` | `#A19DAD` | texto secundário |
| `accent` | `#A78BFA` | ações primárias, dados, plano recomendado |
| `accent-soft` | `#C4B5FD` | rótulos de destaque, links |
| `accent-line` | `#4C3F7A` | bordas de etiqueta de preferência |
| `warn` | `#F5B454` | conflito, limite, quem sai pior |
| `warn-bg` | `#2A2215` | fundo de etiqueta de conflito |
| `warn-line` | `#6B5427` | borda de etiqueta de conflito |
| `neutral-link` | `#4A4560` | linhas de compatibilidade no mapa |

- Violeta só em ações, dados e no plano recomendado. Âmbar só para conflito e limites.
- Tipografia: IBM Plex Sans (400, 500, 600) no texto; IBM Plex Mono (500) em números, rótulos técnicos e etiquetas em caixa alta.
- Raio: 8 px em controles e campos, 10 px em painéis.
- Sem gradientes, sombras chamativas ou emojis.

## Referência visual

`docs/design/` tem as telas aprovadas como HTML com estilos inline: `responder.html` (convidado, celular), `mapa.html` (mapa de tensões, organizador) e `plano.html` (plano e concessões). Use como referência de layout, espaçamento, cores e textos. Elas foram feitas numa ferramenta de design: ignore a sintaxe `{{ }}`, as tags `<sc-for>`, `<x-dc>`, `<helmet>` e os scripts. Reimplemente em React com Tailwind e os tokens acima, sem copiar estilos inline.

## Qualidade

- Acessibilidade: `lang="pt-BR"`, `<label>` em todo campo, `aria-label` em botões só com ícone, alvos de toque de pelo menos 44 px, contraste mínimo de 4,5:1, foco visível, nada clicável que não seja `<button>` ou `<a>`.
- Responsivo: funciona a partir de 360 px de largura. A tela do convidado é pensada primeiro para celular.
- Antes de concluir qualquer tarefa, rode `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`, e corrija o que falhar.
- Textos da interface não supõem gênero de pessoas nem de títulos digitados pelo usuário (por exemplo, "o limite de Eva", não "da Eva").

## Git

- Trabalhe em branch, nunca direto na `main`.
- Commits pequenos, no padrão Conventional Commits, em inglês (`feat: add invite response page`).
- As mensagens de commit e PR não levam linhas de coautoria nem referência a ferramentas de IA.
