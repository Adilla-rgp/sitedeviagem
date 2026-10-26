# Dados de exemplo

Sem `VITE_API_URL`, o site roda no modo demonstração: `src/lib/api.ts` usa `api.ts` desta pasta, que responde como a meridiano-api (mesmo formato, mesmas regras e mensagens) sobre os dados daqui. Todos são da mesma viagem, a "Viagem de julho".

| Arquivo | O que tem |
| --- | --- |
| `destinations.ts` | Catálogo de destinos |
| `trip-july.ts` | Viagem, participantes, restrições salvas e as interpretações de exemplo do texto livre |
| `summaries.ts` | Resumos de restrição que dependem de regra (ordem dos destinos preferidos, datas) |
| `api.ts` | A API de demonstração: as mesmas funções da API real |
| `fixtures/july-trip.json` | Saída do motor para cada etapa da demonstração |
| `fixtures/july-tensions.json` | Mapa de tensões de cada etapa, calculado pelo motor |
| `tensions-fixture.ts` | Leitura do mapa de tensões exportado |
| `engine-fixture.ts` | Leitura do fixture e escolha da rodada que corresponde às respostas salvas |
| `store.ts` | Banco em memória, salvo no `localStorage` |

## Planos vêm do motor

O front não calcula o motor. Os planos, scores, justificativas, destinos excluídos e limites que bloqueiam vêm de `fixtures/july-trip.json`, gerado pelo motor no repositório `meridiano-api`. Nenhum número de plano é escrito à mão.

Quando alguém gera planos, o mock procura a rodada do fixture calculada com exatamente as respostas salvas:

| Rodada | Quem respondeu |
| --- | --- |
| `before_eva_response` | Ana, Bruno e Carla (estado inicial) |
| `after_eva_response` | mais Eva, com a interpretação sugerida |
| `eva_limits_only` | Eva remove a preferência de ritmo antes de enviar |
| `after_diego_response` | mais Diego, que só pode viajar 3 noites: nenhum plano é viável |

Para qualquer outra combinação, a geração de planos e o mapa de tensões avisam que os dados de exemplo não têm esse cálculo. Na demonstração, a recusa devolve o rascunho de restrição vazio, porque não há interpretação de texto.

## Mapa de tensões vem do motor

O front também não calcula o mapa de tensões. `fixtures/july-tensions.json` tem, para cada rodada acima, o mapa no formato de `GET /trips/{id}/tensions`, com os ids da demonstração. Ele é gerado junto com `july-trip.json` pelo `scripts/export_fixture.py` da meridiano-api (seção abaixo). O teste `tensions-fixture.test.ts` confere que ele usa o mesmo grupo dos mocks e do fixture do motor.

## Gerar o fixture de novo

Depois de mudar o motor, ou os dados de entrada aqui (catálogo, restrições, interpretações de exemplo):

1. Atualize os mesmos dados em `meridiano-api/tests/fixtures.py`.
2. No `meridiano-api`, rode:

   ```sh
   .venv/Scripts/python -m scripts.export_fixture --out ../meridiano/src/mocks/fixtures/july-trip.json
   ```

   (no Linux ou macOS, `.venv/bin/python`). O script grava também `july-tensions.json` na mesma pasta. Sem rodar o script, copie os dois arquivos de `meridiano-api/fixtures/`.
3. Rode `npm test`. O teste `engine-fixture.test.ts` falha se o catálogo, a viagem ou as restrições daqui forem diferentes dos que o motor usou.
4. Se o formato dos dados mudou, suba a versão de `STORAGE_KEY` em `store.ts`.
