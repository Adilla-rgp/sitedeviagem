# Dados de exemplo

Enquanto não há API, `src/lib/api.ts` responde com os dados desta pasta, no formato do contrato (`src/types/api.ts`). Todos são da mesma viagem, a "Viagem de julho".

| Arquivo | O que tem |
| --- | --- |
| `destinations.ts` | Catálogo de destinos |
| `trip-july.ts` | Viagem, participantes, restrições salvas e as interpretações de exemplo do texto livre |
| `summaries.ts` | Resumos de restrição que dependem de regra (ordem dos destinos preferidos, datas) |
| `tensions.ts` | Cálculo do mapa de tensões a partir das restrições salvas |
| `fixtures/july-trip.json` | Saída do motor para cada etapa da demonstração |
| `engine-fixture.ts` | Leitura do fixture e escolha da rodada que corresponde às respostas salvas |
| `store.ts` | Banco em memória, salvo no `localStorage` |

## Planos vêm do motor

O front não calcula o motor. Os planos, scores, justificativas, destinos excluídos e limites que bloqueiam vêm de `fixtures/july-trip.json`, gerado pelo motor no repositório `planner-api`. Nenhum número de plano é escrito à mão.

Quando alguém gera planos, o mock procura a rodada do fixture calculada com exatamente as respostas salvas:

| Rodada | Quem respondeu |
| --- | --- |
| `before_eva_response` | Ana, Bruno e Carla (estado inicial) |
| `after_eva_response` | mais Eva, com a interpretação sugerida |
| `eva_limits_only` | Eva remove a preferência de ritmo antes de enviar |
| `after_diego_response` | mais Diego, que só pode viajar 3 noites: nenhum plano é viável |

Para qualquer outra combinação, a geração de planos avisa que os dados de exemplo não têm esse cálculo.

## Gerar o fixture de novo

Depois de mudar o motor, ou os dados de entrada aqui (catálogo, restrições, interpretações de exemplo):

1. Atualize os mesmos dados em `planner-api/tests/fixtures.py`.
2. No `planner-api`, rode:

   ```sh
   .venv/Scripts/python -m scripts.export_fixture --out ../planner-vite/src/mocks/fixtures/july-trip.json
   ```

   (no Linux ou macOS, `.venv/bin/python`).
3. Rode `npm test`. O teste `engine-fixture.test.ts` falha se o catálogo, a viagem ou as restrições daqui forem diferentes dos que o motor usou.
4. Se o formato dos dados mudou, suba a versão de `STORAGE_KEY` em `store.ts`.
