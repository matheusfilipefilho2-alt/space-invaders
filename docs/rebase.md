Matheus, vou analisar isso como se eu fosse um economista de game + arquiteto Web3. E já adianto: o modelo está tecnicamente bem implementado, mas economicamente ele quebra quando colocar o token na DEX.

Pelo que conheço do seu perfil (você construiu BaaS, subadquirente e marketplace), você vai gostar da análise porque o problema é o mesmo de um sistema financeiro: emissão, liquidez e reservas.

### Minha avaliação: 8/10 hoje, 10/10 com alguns ajustes

O que está muito bom

### Arquitetura econômica em três camadas

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><div class="oIb9lq_Box" data-d-align="start" data-d-component="row" data-d-direction="row" style="gap: calc(var(--spacing, 0.25rem) * 3);"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" class="text-base" data-d-component="icon" style="color: rgb(22, 163, 74);"><path d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM16.0755 7.93219C15.6238 7.61436 15 7.72284 14.6822 8.17451L10.6504 13.9039L8.98994 12.0773C8.61843 11.6687 7.98598 11.6386 7.57733 12.0101C7.16867 12.3816 7.13855 13.014 7.51006 13.4227L10.0101 16.1727C10.2142 16.3973 10.5093 16.517 10.8123 16.4981C11.1152 16.4792 11.3931 16.3237 11.5678 16.0755L16.3178 9.32549C16.6356 8.87383 16.5272 8.25003 16.0755 7.93219Z" fill="currentColor"></path></svg><div class="oIb9lq_Box" data-d-component="box" data-d-direction="col" style="gap: calc(var(--spacing, 0.25rem) * 0);"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-weight="medium" style="color: rgb(22, 163, 74);">Economia interna</p><span class="w6asjq_TextBase Wj_uza_Caption" data-d-component="caption" data-d-size="md" data-d-weight="normal">Gold/moedas separadas da blockchain.</span></div></div></td><td data-d-component="table-cell" data-d-valign="start"><div class="oIb9lq_Box" data-d-align="start" data-d-component="row" data-d-direction="row" style="gap: calc(var(--spacing, 0.25rem) * 3);"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" class="text-base" data-d-component="icon" style="color: rgb(22, 163, 74);"><path d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM16.0755 7.93219C15.6238 7.61436 15 7.72284 14.6822 8.17451L10.6504 13.9039L8.98994 12.0773C8.61843 11.6687 7.98598 11.6386 7.57733 12.0101C7.16867 12.3816 7.13855 13.014 7.51006 13.4227L10.0101 16.1727C10.2142 16.3973 10.5093 16.517 10.8123 16.4981C11.1152 16.4792 11.3931 16.3237 11.5678 16.0755L16.3178 9.32549C16.6356 8.87383 16.5272 8.25003 16.0755 7.93219Z" fill="currentColor"></path></svg><div class="oIb9lq_Box" data-d-component="box" data-d-direction="col" style="gap: calc(var(--spacing, 0.25rem) * 0);"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-weight="medium" style="color: rgb(22, 163, 74);">PIX → moedas</p><span class="w6asjq_TextBase Wj_uza_Caption" data-d-component="caption" data-d-size="md" data-d-weight="normal">Excelente onboarding para quem nunca usou crypto.</span></div></div></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><div class="oIb9lq_Box" data-d-align="start" data-d-component="row" data-d-direction="row" style="gap: calc(var(--spacing, 0.25rem) * 3);"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" class="text-base" data-d-component="icon" style="color: rgb(22, 163, 74);"><path d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM16.0755 7.93219C15.6238 7.61436 15 7.72284 14.6822 8.17451L10.6504 13.9039L8.98994 12.0773C8.61843 11.6687 7.98598 11.6386 7.57733 12.0101C7.16867 12.3816 7.13855 13.014 7.51006 13.4227L10.0101 16.1727C10.2142 16.3973 10.5093 16.517 10.8123 16.4981C11.1152 16.4792 11.3931 16.3237 11.5678 16.0755L16.3178 9.32549C16.6356 8.87383 16.5272 8.25003 16.0755 7.93219Z" fill="currentColor"></path></svg><div class="oIb9lq_Box" data-d-component="box" data-d-direction="col" style="gap: calc(var(--spacing, 0.25rem) * 0);"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-weight="medium" style="color: rgb(22, 163, 74);">Blockchain opcional</p><span class="w6asjq_TextBase Wj_uza_Caption" data-d-component="caption" data-d-size="md" data-d-weight="normal">O jogador pode jogar sem carteira.</span></div></div></td><td data-d-component="table-cell" data-d-valign="start"><div class="oIb9lq_Box" data-d-align="start" data-d-component="row" data-d-direction="row" style="gap: calc(var(--spacing, 0.25rem) * 3);"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" class="text-base" data-d-component="icon" style="color: rgb(22, 163, 74);"><path d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM16.0755 7.93219C15.6238 7.61436 15 7.72284 14.6822 8.17451L10.6504 13.9039L8.98994 12.0773C8.61843 11.6687 7.98598 11.6386 7.57733 12.0101C7.16867 12.3816 7.13855 13.014 7.51006 13.4227L10.0101 16.1727C10.2142 16.3973 10.5093 16.517 10.8123 16.4981C11.1152 16.4792 11.3931 16.3237 11.5678 16.0755L16.3178 9.32549C16.6356 8.87383 16.5272 8.25003 16.0755 7.93219Z" fill="currentColor"></path></svg><div class="oIb9lq_Box" data-d-component="box" data-d-direction="col" style="gap: calc(var(--spacing, 0.25rem) * 0);"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-weight="medium" style="color: rgb(22, 163, 74);">Rollback e segurança</p><span class="w6asjq_TextBase Wj_uza_Caption" data-d-component="caption" data-d-size="md" data-d-weight="normal">Bem pensado para Solana.</span></div></div></td></tr></tbody></table>

O maior risco

### 1 moeda = 1 SPACE negociável

Essa paridade cria inflação automática quando jogadores sacam para vender na DEX.

### O problema fatal: sua DEX vira um caixa eletrônico

Hoje seu fluxo é esse:

![](blob\:https://chatgpt.com/2d60444f-f9ff-463f-9af5-74e60816dcac)

Agora imagina o lançamento.

### Cenário real

<table class="_6IUVGW_Table" data-d-column-sizing="auto" data-d-dividers="" style="table-layout: auto;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Jogadores ativos</span></p></td><td data-d-component="table-cell" data-d-valign="start">10.000</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Média moedas/dia</span></p></td><td data-d-component="table-cell" data-d-valign="start">50</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">SPACE emitidos/dia</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">500.000</span></p></td></tr></tbody></table>

Se apenas 20% sacarem:

100.000 SPACE vendidos por dia.

Agora olha a liquidez.

### Liquidez inicial da DEX

Você coloca:

<table class="_6IUVGW_Table" data-d-column-sizing="auto" data-d-dividers="" style="table-layout: auto;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Liquidez</span></p></td><td data-d-component="table-cell" data-d-valign="start">100.000 USDC + 10.000.000 SPACE</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Preço inicial</span></p></td><td data-d-component="table-cell" data-d-valign="start">1 SPACE = US$ 0,01</td></tr></tbody></table>

### Dia 1

100.000 SPACE vendidos.

O AMM faz isso:

Opções do gráfico

Exemplo de pressão de venda na DEX

Liquidez constante simplificada apenas para ilustrar a queda de preço.



Em uma semana você perdeu metade do valor.

Isso aconteceu com Axie Infinity, Bomb Crypto, StepN e dezenas de Play-to-Earn.

### O erro é tratar moeda in-game como dinheiro

Hoje sua moeda é simultaneamente:

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Gold</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">SPACE</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Recompensa.</td><td data-d-component="table-cell" data-d-valign="start">Ativo financeiro.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Compra skin.</td><td data-d-component="table-cell" data-d-valign="start">Pode vender.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Progressão.</td><td data-d-component="table-cell" data-d-valign="start">Especulação.</td></tr></tbody></table>

Esses papéis entram em conflito.

### Como eu redesenharia o Space Invaders

### Nova economia (recomendada)

![Explore 9 Unique Pixel Art Futuristic Starfighters](https://images.openai.com/static-rsc-4/PafwOr6ZuhcPcoobSY7hUs2p0kxxsNHfyrHg9uXL7wSVOS5cIEKyCxQ7IVanC6mxyjpSFvpdlGzlFUlYiTHZ5r68opSATT30cPmQiik4ukRKezc_fmWX_Iw_tyUL_FErH6qG_QcSoAz8t6Rfzapb34D3rkI7NTdXGFf2yisY7Ww?purpose=inline)

![Shmup ships | MLTSHP](https://images.openai.com/static-rsc-4/IxcFQMdZTVplExmYVOABi26nKKnJBEhRuFwiHy62u4iJlncNDNGgpXc82NgMfFtZRS7kYNB_gx8TuT_DDSpc47-9eTmXY1gN7zmHjQXOTWBAnZiyF8SPdp8uebreX9Alfj6UZN8cZBFICAJ8Kz5NXaFNY1pefczOz9dcLs-hya4?purpose=inline)

![Solana Price Forecast – SOL-USD at $196 Holds $180 Support, Eyes Breakout Toward $250](https://images.openai.com/static-rsc-4/BgLMJlXq8UhLXXdKtRRjX8NRRRwHvLk38STgGfF1XTsZw9A9SdPWqX5LH6FFGPvTcYN5H3_JrpyojrgnzPb-l7gUzA-osoDcXXNeb6sB8aVGgvC8rmJdBJbHZw6ivooQXq7I1kJ7hjmj1vjyEjJKQZ4ujYVLnY7pGCAGeXCDvUk?purpose=inline)

6

![](blob\:https://chatgpt.com/87ebbdd6-b574-44ba-a0d3-379ec37fabbe)

### Agora existem 3 ativos diferentes

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Gold (Off-chain)</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">SPACE (On-chain)</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">NFT</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Ganha jogando.</td><td data-d-component="table-cell" data-d-valign="start">Ativo limitado.</td><td data-d-component="table-cell" data-d-valign="start">Propriedade digital.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Não vai para DEX.</td><td data-d-component="table-cell" data-d-valign="start">Vai para DEX.</td><td data-d-component="table-cell" data-d-valign="start">Marketplace.</td></tr></tbody></table>

### Mudança mais importante: remover o 1:1

Hoje:

> 1 moeda = 1 SPACE.

Minha sugestão:

### Conversão variável

<table class="_6IUVGW_Table" data-d-column-sizing="auto" data-d-dividers="" style="table-layout: auto;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Situação</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">SPACE recebido</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">100 moedas</td><td data-d-component="table-cell" data-d-valign="start">1 SPACE</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">500 moedas</td><td data-d-component="table-cell" data-d-valign="start">5 SPACE</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">1000 moedas</td><td data-d-component="table-cell" data-d-valign="start">10 SPACE</td></tr></tbody></table>

Agora você controla emissão.

### Melhor ainda: Treasury dinâmica

![Galaxy, Multicoin, and Jump Crypto Plan $1B Vehicle for a Publicly-Traded Solana Treasury](https://images.openai.com/static-rsc-4/NRKzXCmyB39qgPqa6HdnhI47Xvwl9klI45GECwlra9BpyVPRRi_Su2HAR-E8AUv63CjloAG6M3RIQUwWfflRtjDO1hO9eEIq9t0Jvg_eANbOXflA8715FyT5cQIdRvTu3WL0EVdTn4giGFC-8LsnExNXzm3ZBbvJZ64KNgfX4co?purpose=inline)

![Mavryk](https://images.openai.com/static-rsc-4/COBlO1vX9FYMJaIDREbCOjuy6_LWJo74HOLvQhjqWnkgtEjvtW-VBL9GUZ7omlEYeN4w5XOb5NNN6eEjX4Anz2n1FWbk-FkEgJfJKxK3oQD_SygudcvP27cGuMh2LQuGAp2eDv7BIKxg1P7IJeuicCaS-Wyg-j0gJjq3OD5hnnM?purpose=inline)

![Dust Settle 3D - Galaxy Attack - APK Download for Android | Aptoide](https://images.openai.com/static-rsc-4/fWIVHIicCyYmchu2QADiLyNXbs2lLe9xzPByBBJo4Ji42AiNbQdDhhqOZhqTjPYwYjRFmCGQMSJ-t7RIVdtUiNDyJHOi7aY974F6THDf2h14UoLhjXEOzOTby9aACNoWh9r9CQreocDAlfl47cAjjMPzYoa5WGNp7yFvWGJP2YU?purpose=inline)

5

Toda emissão sai de uma Treasury.

![](blob\:https://chatgpt.com/5c5f5094-ef0b-40e4-a810-3e83600ebcbd)

Toda saída reduz reservas.

### A Treasury precisa ganhar dinheiro

Você precisa criar entradas.

<table class="_6IUVGW_Table" data-d-column-sizing="auto" data-d-dividers="" style="table-layout: auto;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Receita</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Vai para Treasury</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">PIX de moedas</td><td data-d-component="table-cell" data-d-valign="start">✅ 100%</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Venda de skins NFT</td><td data-d-component="table-cell" data-d-valign="start">✅ 95%</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Marketplace</td><td data-d-component="table-cell" data-d-valign="start">Taxa 2,5%</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Battle Pass</td><td data-d-component="table-cell" data-d-valign="start">SPACE</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Torneios</td><td data-d-component="table-cell" data-d-valign="start">SPACE</td></tr></tbody></table>

### Coloque sinks (sumidouros) de moedas

Hoje você tem alguns.

Eu adicionaria muito mais.

### Gold sinks

![Games like Faster Bunnies • Games similar to Faster Bunnies • RAWG](https://images.openai.com/static-rsc-4/0KBnOaGaUzLYyDzhCrU1H89KcHauKKDVOFeIJhTX8NhkxRMBg2ko9xeIkRz4HAdeeVNqYnI5ireVd1U-hy5nNNWJ-eY4T32vefrSxpSQ6YjYt3cs1csmw_P2qRoIBJbP_bdsmKG_G74DHeeBYwsUtFS8hDEQB_KS2MD7DbGe1qo?purpose=inline)

![Save 90% on Space Mechanic Simulator on Steam](https://images.openai.com/static-rsc-4/oUaW5ZeFxn2yPcd4w9YRFD2bevFuUd0yE_EFMJ73fXXLv2TZAMVZ4IOjS9Wjy8qnWobMrhvuR7_D865CzNslscurcX-kxR83Oudz9VrgC5eLHyBaK4RoQD0fMNcYo0XKBv5j2aifBnBZQLP9bIgUr0ZkkWk9Q3Ph6C8la7MqOB4?purpose=inline)

![Page Revision for Blueprint Mechanic Des... | BookStack](https://images.openai.com/static-rsc-4/VS2Is37ySXlG9e6M_jxFlxg_yJbGuEl9xTQh_CmO7okanYNAXI3x4h_ptb1Ojb-y5cnAASvg418XinmMdM4wYeqYIMZFqisetE2PIrz0sVrSoUhZod0d3CMAGfBzJ0DH2A2Ih8kBM73M9P_Amrl_QJG9nm_CzK_Nhfoe2h863DU?purpose=inline)

7

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Sistema</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Queima Gold</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Upgrade da nave.</td><td data-d-component="table-cell" data-d-valign="start">Sim.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Reparar dano.</td><td data-d-component="table-cell" data-d-valign="start">Sim.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Abrir baús.</td><td data-d-component="table-cell" data-d-valign="start">Sim.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Craft de armas.</td><td data-d-component="table-cell" data-d-valign="start">Sim.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Energia.</td><td data-d-component="table-cell" data-d-valign="start">Sim.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Battle Pass.</td><td data-d-component="table-cell" data-d-valign="start">Sim.</td></tr></tbody></table>

Objetivo:

> Mais moedas saindo do que entrando.

### SPACE sinks

Aqui é onde você protege o preço.

![Marinade Finance: Solana Liquid Staking & mSOL | Learn SimpleSwap](https://images.openai.com/static-rsc-4/ytm98RNIRvLh_8BYLCfLo6_yGpCKrUvrMN80-lGJlScXUwDJ2o_Ggjr0KBZS79Bai_vMxFKS1SIFJdKt2eDrUOtMHFzJmIAtjE8jfMd4w0Bdo5K8u_5RPf4gOaJ-T-jrz5lGeeSAggu81RddDY-Oa0pmvwab60EdwBu4TpQo2iA?purpose=inline)

![](https://images.openai.com/static-rsc-4/rYwqhdbJKWqToI4yQhFJWbnyBGGaga3VH_KuLnQzxIAyktG5GYCqNEDm-dCvDS85LRAorhgo7vdiyMT2hkoCh0twIBuCpONEkx6mVnFMxffMKLuc3lp46mAN_6_MAHrEbQSKIkZcr3B7tePMr-XY_HJfrpzUCClJLy9e23loYkw?purpose=inline)

![Spaceship Pixel Art --chaos 30 Pixel Art | pxlart](https://images.openai.com/static-rsc-4/zZqRaytAYyi6IG_AZwj0HyB7t3m8pZi0NdDtHnymergJady1DrVpOr1aIuqTw2kXb-d8YI69lA2DXfTWfLqJazE1n2qBc7UDWShBLFMWJSX8lMo8KTOocs-nqnvMS0ilFYE_1paFbIq9wWouMhPPisKnnxup4Wz8y6H0ywQqOKI?purpose=inline)

6

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Uso</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Destino</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Battle Pass Premium.</td><td data-d-component="table-cell" data-d-valign="start">Queima.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Entrar em campeonato.</td><td data-d-component="table-cell" data-d-valign="start">Treasury.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Comprar nave NFT.</td><td data-d-component="table-cell" data-d-valign="start">Treasury.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Evoluir NFT.</td><td data-d-component="table-cell" data-d-valign="start">Burn.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Guildas.</td><td data-d-component="table-cell" data-d-valign="start">Lock.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Stake.</td><td data-d-component="table-cell" data-d-valign="start">Lock temporário.</td></tr></tbody></table>

Quanto mais lock e burn, menos venda.

### Battle Pass em blockchain

![Game UI Sci-fi Battle Pass screen :: Behance](https://images.openai.com/static-rsc-4/CSHBqyQXfbCckrcG0y7xSuDnx6lgqMdUGfLHoNyHql80t_cktlF0GvVJCYFqi40Wdz8nfrSEfYzaQEcF29J96c_zTzbooUQADrL8y6hVdNVm7QoEm3GqJ3Z-cbNU_HdYobiJddXmJxodZobDzgOE59gxOp0m0RKDwaI4DDs6u9s?purpose=inline)

![Steam Community :: Pixel Starships](https://images.openai.com/static-rsc-4/1eki2cMG3aQFmQFiihxekYWN_a_XxCJFSyTfVULcxkrjdRz3U7WXrYkDCc51YbhPp56CTHcMp6djnklctPD57DZVZkz1zGVrb01Yg7MamnEsyQD_W3EOwMriJ96mjH0ioI3OKtHU7nuyII_3Bef7q2a-E_zbA0xLaq5a9HXz7gU?purpose=inline)

![Starborne Frontiers - Offers UI :: Behance](https://images.openai.com/static-rsc-4/Ub5TT81ySHndMkL83eQIcOaYJgU8BKH7tI1br-nDz4Mcj8RvVfFvI8pBVO2A6SZzIKsX9qwZbqk0hlYKHG-_Ly204xO1IlTx7aWx731lpai8pgR8k0ys5Pkf6TBA33NbZP6psArqoDwuTS8mdh1YfBUek2OGtuufbvPqAN8oQ9w?purpose=inline)

Eu faria isso imediatamente.

### Exemplo

<table class="_6IUVGW_Table" data-d-column-sizing="auto" data-d-dividers="" style="table-layout: auto;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Passe</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Preço</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Temporada</td><td data-d-component="table-cell" data-d-valign="start">50 SPACE</td></tr></tbody></table>

Benefícios:

* skins exclusivas

* nave NFT

* boosters

* títulos

* leaderboard premium

Esses 50 SPACE:

* 20 queimados.

* 30 Treasury.

### Marketplace NFT

Essa é a maior oportunidade do Space Invaders.

![Explore 9 Unique Pixel Art Futuristic Starfighters](https://images.openai.com/static-rsc-4/PafwOr6ZuhcPcoobSY7hUs2p0kxxsNHfyrHg9uXL7wSVOS5cIEKyCxQ7IVanC6mxyjpSFvpdlGzlFUlYiTHZ5r68opSATT30cPmQiik4ukRKezc_fmWX_Iw_tyUL_FErH6qG_QcSoAz8t6Rfzapb34D3rkI7NTdXGFf2yisY7Ww?purpose=inline)

![Ultimatum Sticker - Ultimatum - Discover & Share GIFs](https://images.openai.com/static-rsc-4/Pqw70NX2abA0brFw_KTDpA-k-DQxps9Ih8Un2EVmDEGjqgzjKkrN5E2whsBKmbwbW1vc77RME2CNxbWo6oQQrKXrmBTKeEIk4aHqD4X8W9mQVUibAToCJ9pC_tojTS_uKUcbt1T12ZzdjxH2e4C_KOMVQhTWYBvcKSIKEaVebUk?purpose=inline)

![Shmup ships | MLTSHP](https://images.openai.com/static-rsc-4/IxcFQMdZTVplExmYVOABi26nKKnJBEhRuFwiHy62u4iJlncNDNGgpXc82NgMfFtZRS7kYNB_gx8TuT_DDSpc47-9eTmXY1gN7zmHjQXOTWBAnZiyF8SPdp8uebreX9Alfj6UZN8cZBFICAJ8Kz5NXaFNY1pefczOz9dcLs-hya4?purpose=inline)

5

Você já vende skins.

Transforme algumas em NFT.

### Exemplos

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">NFT</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Utilidade</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Millennium Falcon NFT.</td><td data-d-component="table-cell" data-d-valign="start">Skin rara negociável.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Nave Dourada Genesis.</td><td data-d-component="table-cell" data-d-valign="start">Supply 500.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Laser Azul NFT.</td><td data-d-component="table-cell" data-d-valign="start">Efeito visual.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Companion Drone.</td><td data-d-component="table-cell" data-d-valign="start">Cosmético.</td></tr></tbody></table>

### Marketplace interno

![Game UI Design | Freelancer](https://images.openai.com/static-rsc-4/dosCYZ7IbnorZEc_zINWxmwQ9XCeoyCS6g9WMimlGV2NAwysaGeWG224zTWqYyUX3Es9SCscqEf8qyGhsuVQsFIBsg3nT_dszzl2dD8aPJXRrFr-xcW_jyKQhkmoXOdrcbirlTFgS8vsMO8AnddZwULjUIwjI5OIyqgL873Yw7Y?purpose=inline)

![Browse thousands of Marketplace Game images for design inspiration | Dribbble](https://images.openai.com/static-rsc-4/IbFIn7bFNVosWV0dRqxuVatpmK9VZMviXq9zlMtbDYWsq6Mk5tDFVOgQYtaDmnOTXULoegnakNRO-HOWS2pIXIxqhIB9Rp3JALfENfbP_9XnjZkE7sCluFyi4UGfW3CBJJIRu1s74bwaq8AN86OVrVxbNQAsSXCG2Dx9IB1N660?purpose=inline)

![Blast'Em (@playblastem) on X](https://images.openai.com/static-rsc-4/fXdjVzVB0N9EmmHTd7tURxb5giMeJqe16_Q5b0EWWcwpFK_p4WSwCCqF8o4y37ApMp32riku3u44souqLKmUqh_tT2zuxgRsf3quPht_EukInKRWVS-Ml3pGyffWFtc4tk9Al3XFfLZ7Zq74D8JoyewcACAseiuBFE3ChCUdtrU?purpose=inline)

6

Fluxo:

![](blob\:https://chatgpt.com/567605b3-3c20-41ab-8b6c-2fd1efca3b6a)

Taxa:

2,5%

Distribuição:

<table class="_6IUVGW_Table" data-d-column-sizing="auto" data-d-dividers="" style="table-layout: auto;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Destino</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Percentual</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Treasury.</td><td data-d-component="table-cell" data-d-valign="start">2%</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Burn.</td><td data-d-component="table-cell" data-d-valign="start">0,5%</td></tr></tbody></table>

Você cria receita recorrente.

### Torneios PvP pagam em SPACE

![Esports tournament schedule Images - Free Download on Magnific (formerly Freepik)](https://images.openai.com/static-rsc-4/PiTGp9vagbsp13KyZ6Bt1Pk89ChVQG5fAuCq-DovIbtg1zvqN-67VQZPiT-ntj-GDfxw-JDyvjS9hh_HyqlAyEH1hTj70u9Ywmolyf2_B6al-MGhqBpFBraq5wfpXhJUgjhod9hc7J2L3wkEoyCl48ZcrdrmeBk_MC9H9bUHVDY?purpose=inline)

![Gamer Arena for Android - Download the APK from Uptodown](https://images.openai.com/static-rsc-4/P_YfosiULy39TvhAua7bN1SX1YO2JSUu8GzY1W9R8grgvVvLLuQs9a47_Tmkl4wjLjoLyq0vlgBfnFHXAEWWdRE-P7CAJOngJjdBatsDGXJFUbqcAX0O9_59aX8b8d2YFo4KzDU1T6BCYuXDA0-1nSjhuJlxrcfA78MF9QXBxoc?purpose=inline)

![Star Thunder: Space Shooter (iOS) — Price History & Similar | AppAgg](https://images.openai.com/static-rsc-4/Ugi2KHC6IpwlCYl4tOHGN4yZlQhz99tFuLVlEJ0pbz6xXSt5sAAswdg5H_lUlByAGks8trLZAibKkOAZ5dJPnvRietxOqOWKVt94L9TCW_udlPRi3NirpsblWeB9Dq21ttP-Cq7O_ABxOsojv14aWHG00FJfoLgBe8ixus0PvgI?purpose=inline)

5

Não distribua tokens por jogar.

Distribua por competir.

### Exemplo

<table class="_6IUVGW_Table" data-d-column-sizing="auto" data-d-dividers="" style="table-layout: auto;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Entrada</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">10 SPACE</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">100 jogadores.</td><td data-d-component="table-cell" data-d-valign="start">1.000 SPACE no prêmio.</td></tr></tbody></table>

Distribuição:

<table class="_6IUVGW_Table" data-d-column-sizing="auto" data-d-dividers="" style="table-layout: auto;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Destino</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">SPACE</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Campeões.</td><td data-d-component="table-cell" data-d-valign="start">800</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Treasury.</td><td data-d-component="table-cell" data-d-valign="start">150</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Burn.</td><td data-d-component="table-cell" data-d-valign="start">50</td></tr></tbody></table>

Nenhum token novo foi emitido.

### Ranking Semanal (melhor recompensa)

![Space Shooter UI Download Pack - CraftPix.net](https://images.openai.com/static-rsc-4/w_yOfHMNXQ7fjaeFiJ8QMFQR95_o8kiJ-nZa99-em1kgx4TZG0Xtf_Evp-LJDKsWOIZaFa5VswjOL4jfYGyg5O60TdiZyaybHLnyxaWOpUdYmDhm8bxu66oeXvsYTgAhgxC4T2IaCubir0bebPNWZEvFJTrHe69IPqPc7ngzEYk?purpose=inline)

![Neurex - release date, videos, screenshots, reviews on RAWG](https://images.openai.com/static-rsc-4/AihP6suIc-4wqGZbHpd6Zbs5KXE0l-71XXbelM7MCjQmO5z0mmTlhqnAFsKBrsexQ6jQ-HoaJePfwfOaFovpjF_ZhKar0JOk4XxC9geA7uJqf4CmypyuVRO0HH9zJMDvD76yo5K-iM2a1g5Bi7tW9l78FoymjET41pSxhZgEpIM?purpose=inline)

![Download Terraforming Mars for Windows, macOS, Android and iOS | Gizmodo](https://images.openai.com/static-rsc-4/s1PwVmIx-v9yh9Y8yQoKYuw3uKFQ-pDe8ZcLqKxxkk0SG4VevSW2NOq7BaudpvLqih2tA2T3I3vh0bAWEpwxUcBSqiuOoLNo20S5eOmv_FLuCpQT-X3HrzHo5xoU8UBrvN_7gI5Kvc5WQQ5DwpqWr9rfN9x0t55sx5bCjBHujb0?purpose=inline)

6

Em vez de todos ganharem SPACE.

### Ranking

Opções do gráfico

Exemplo de distribuição semanal para Top 100

A maior parte dos jogadores recebe Gold e itens; apenas o topo recebe SPACE.



Todos os demais recebem Gold, XP e itens.

Você reduz emissão em 95%.

### Tokenomics que eu faria

### Supply

Opções do gráfico

Exemplo de tokenomics do SPACE

Distribuição ilustrativa para um token de utilidade em Solana.

Battle Pass / Eventos

Liquidez DEX

Marketing

Parceiros

Play & Earn

Time (vesting 36 meses)

Treasury

### Vesting

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Categoria</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Regra</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Team.</td><td data-d-component="table-cell" data-d-valign="start">36 meses.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Marketing.</td><td data-d-component="table-cell" data-d-valign="start">Liberação mensal.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Liquidez.</td><td data-d-component="table-cell" data-d-valign="start">Bloqueada.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Rewards.</td><td data-d-component="table-cell" data-d-valign="start">Liberação dinâmica.</td></tr></tbody></table>

### Como colocar na Raydium (Solana)

![Raydium - Solana](https://images.openai.com/static-rsc-4/sRHYeFexCzvKvXwkAdAJ-geChXDZDY4E676e2-ldw_EIdGbqFMe-tVbuuPQoR-mZXA3KZAsnVWlmSrazF4JVnuhjzvCYuMH8wW4dtO__h1C_GYIPtENNfzztdl0U82amwqI942ajzhaS6UMgzZJ0gOoABzGfhkOXnw-CWMgZLa0?purpose=inline)

![Formerly embroiled in a market manipulation scandal, can Meteora be reborn through a TGE? - BlockBeats](https://images.openai.com/static-rsc-4/QXos7biR-8QHnKu8XGHlY2JALTT8awk9GJQyPH2XQ9tIGGzoZALdJTvGtNDCfULivjAuW2WKogjsCff8BZg87bX4FzaHUQUMg0xG77G0pKFu9OUfOAwZ2N6_mAmYOrBWcZMS9sI2bh0PB2tnCbCG7iQt33qu2tQJOpPk6_QtY6U?purpose=inline)

![](https://images.openai.com/static-rsc-4/qySkAhW_LrZ4S3vSz-a9bNdwjgGFejZPU42W09qG8DMukVgRTa_4N9cbjs5MGeSjepp9Zi0fPcxpUFoTuSfumN2URHip-fveWTq5i90x1ezXKDudzhx3MQI2YCDQjQgQMxbTcyjmS7K33xu1L7PCP4ZqXdTl036YrokFoirKNmI?purpose=inline)

4

Você perguntou se compensa colocar numa DEX.

### Sim. Eu colocaria na Raydium.

### Estrutura

<table class="_6IUVGW_Table" data-d-column-sizing="auto" data-d-dividers="" style="table-layout: auto;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Pool</span></p></td><td data-d-component="table-cell" data-d-valign="start">SPACE / USDC</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Liquidez inicial.</td><td data-d-component="table-cell" data-d-valign="start">50.000 USDC + SPACE equivalente.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">LP.</td><td data-d-component="table-cell" data-d-valign="start">Travada por 12–24 meses.</td></tr></tbody></table>

Não use SOL como principal.

USDC reduz volatilidade.

### Liquidez dinâmica

A Treasury pode recomprar SPACE.

![](blob\:https://chatgpt.com/f103e9b6-11e9-48f9-9ee7-b2c1270bb4fe)

Mas somente usando receita real.

### Emissão baseada em receita (minha favorita)

Hoje você emite por pontos.

Eu faria um limite diário.

### Fórmula

SPACEdia=min⁡(RewardsGameplay, Receita24h×0.30)SPACE_{dia}=\min(Rewards_{Gameplay},\ Receita_{24h}\times0.30)SPACEdia=min(RewardsGameplay, Receita24h×0.30)

Ou seja:

Se o jogo faturou R$1.000 hoje.

Apenas uma parte pode virar SPACE.

### Exemplo

Opções do gráfico

Exemplo de emissão diária limitada por receita

A emissão cresce com a receita do jogo em vez do número de partidas.



O token passa a ter lastro em receita.

### Adicione um sistema de HALVING

![半減期後のビットコイン、価格上昇は？過去のデータを徹底分析 - CRYPTO TIMES](https://images.openai.com/static-rsc-4/N4qg5VIAG4oMx_eZjRz_dkwlVknPGwGHkUBtfsqjHcMKNpdLtkAzOIjN6OGHcwweOosKFzoTlIMJIJWRZoNY-gaNiBm8WtbH-OJbNufNZb5kTnVOfNwe7Xty7EVJrXl3RrInijASIQ8xhT84mLy4fQQY518bpFxX3UrdDUUKHIU?purpose=inline)

![Eco Pump 100%, what other wealth codes worth paying attention to on Sonic? | Bitget News](https://images.openai.com/static-rsc-4/ttf5ZatTtU96r_ZSFAgxRIi95RK-9Ek-p-PNRZ9FIhX2BI_BESPvfZ4vyRHVImaOdSuF3MgIwbvu394UA9qDkAWS0aj776aPEPQ4qj3Lq5QYj3ePRrsxuB_AxdhkfzCuaL4O-fzqHT6x6Ptveqfg1E5CSA4HxYNqlPTHcGfN83Y?purpose=inline)

![Vibrant Bitcoin Explosion Artwork | Dynamic Crypto Image | AI Art Generator | Easy-Peasy.AI](https://images.openai.com/static-rsc-4/opiiIxzVGQeMnwbn2N0QnAJhsx7v1NS8xeilaJZ0AZVKT5ZWTknES-jzE-45EYltMSI2mGWC9T6AmzX_d54OobhglQXDFMmyCywfu_cj2x3nYDcHOjgCDdiBlQtJaGtm81hkcUnHna2xuDB3RcQujixcXamzimNJVXflpx-YvbA?purpose=inline)

Inspirado no Bitcoin.

<table class="_6IUVGW_Table" data-d-column-sizing="auto" data-d-dividers="" style="table-layout: auto;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Temporada</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">SPACE por ranking</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Season 1</td><td data-d-component="table-cell" data-d-valign="start">100%</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Season 2</td><td data-d-component="table-cell" data-d-valign="start">75%</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Season 3</td><td data-d-component="table-cell" data-d-valign="start">50%</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Season 4</td><td data-d-component="table-cell" data-d-valign="start">35%</td></tr></tbody></table>

Menos inflação ao longo do tempo.

### Staking para jogadores

![Phantom Wallet Review 2025: Features + Pros & Cons Explored - Coin Bureau](https://images.openai.com/static-rsc-4/_9tuxG67z8x7yOiCOVOr9_cRwPh5Q8-pJc2rPERAgTaTIPidulcdPGqwoGHkIE4FqIefy-GzhlGay13163FOdvA6sNU5oBjoaUaeI6rlic-ND0cHUbljYCDuoualQxaTVZzb18QGjZstEpljN_xaydLMJAEg2LxrQvRyh_VFYZk?purpose=inline)

![MoonPay: Buy Crypto & Bitcoin](https://images.openai.com/static-rsc-4/0tY1O7vvDj6gmrpKkGU9og30yWHWuITh5Ysz4ZYnmhLa4fOwCPFUpBcClWQUb5y_yOjRLXYr_k-xmmrWzZivco8qYHTcPCrNqyyUXfT-d5t4vSNWX0Ti6ssD-QL3zuA80p14ZmrIiiZxVRFprZzmd2Mm8F-B5I-FwXgUt9ZZH1o?purpose=inline)

![Space Station Tycoon on Steam](https://images.openai.com/static-rsc-4/y2Y_dxcHecJOZf-4dwNVRl8hDpX6u0BNaEQ3iUNInC_Tmdb-hfrO5xGgtEuQ2z9iQAkDrajLGxltESlL32r2Mz3LUVXoWScdZ195YqmtP1TF5-hAPfGHxKJbutgPFY68q1Uw3ImjLOjaixoI6ckwh9cSNzhoiI7S2BuTW1TvUXQ?purpose=inline)

5

### Exemplo

<table class="_6IUVGW_Table" data-d-column-sizing="auto" data-d-dividers="" style="table-layout: auto;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Stake</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Benefício</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">100 SPACE.</td><td data-d-component="table-cell" data-d-valign="start">Skin exclusiva.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">500 SPACE.</td><td data-d-component="table-cell" data-d-valign="start">10% XP bônus.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">1000 SPACE.</td><td data-d-component="table-cell" data-d-valign="start">Acesso beta.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">5000 SPACE.</td><td data-d-component="table-cell" data-d-valign="start">Guild Leader.</td></tr></tbody></table>

Os tokens ficam travados.

### Economia com Guildas

![Best Flagship Builds - Foundation: Galactic Frontier](https://images.openai.com/static-rsc-4/j116kPzfVJq74jaVl3gTO7wLNdN2qllryvKqNadGk7TsOkAKYh0lfSRIz63Y0Jw3y2qTZ5y15YwifKZ3FLaFQ0XoDW0C2lcUMUUolx3IKQoF99de2Cdy4dYzCCNltldxdKINdUlRylsSp1exZcnMCXhwL9JF7XSefmM_IGCauEk?purpose=inline)

![Pixel Starships How To Get New Ships - Design Talk](https://images.openai.com/static-rsc-4/yK1n3qobxf7WJxwP_dLqL4n5Ppmo8bLmG370x0RArOh-9n0TiWRmocgo-1xIrVr4-e_TVHqE6VZ1u9idT5aFT5t4F26g2ugVOGri1QlqaNBUouSm-BlInTdZEaFMrKrMdbmsNesXLlrsEk9OoDCdhJgTwUoqqffy6zj7NLCUz2Q?purpose=inline)

![Stellar Age for Android - Download the APK from Uptodown](https://images.openai.com/static-rsc-4/JAKqbZlUczpvxVpgD3V3w89I8hPt8A-Fg9wF-g9bpCowQbONIjP_OnPotldal0CT6fKQfxwnA8j23MlrPqisoZ4z0f99YbsshFng4QWBwmRxnDshKK2ThYMqjepYuyiLEG8oVTSfSwBBtrp9nXyqOR2yW2Kard3PXMizf1CYnMo?purpose=inline)

5

Você pode criar clãs.

Cada guilda precisa bloquear SPACE.

<table class="_6IUVGW_Table" data-d-column-sizing="auto" data-d-dividers="" style="table-layout: auto;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Ação</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">SPACE</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Criar guilda.</td><td data-d-component="table-cell" data-d-valign="start">500</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Expandir guilda.</td><td data-d-component="table-cell" data-d-valign="start">200</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Guerra espacial.</td><td data-d-component="table-cell" data-d-valign="start">Entrada.</td></tr></tbody></table>

Mais lock.

### Economia de temporadas

![Introduction to Season Pass | AccelByte Documentation](https://images.openai.com/static-rsc-4/NaHI67-iolrYQAYGVHbcrq-AvC3af3Ws2PNhA1D8AgW-4g23RSanSgUA1QO_HfUGRGc3BxZ41QctcApCAqrBZFaRLFaa16iuOC-OM24fs5kQcYeP3uFKSiL65bpTbjugFHHQIoLczP47xJ34Y_vhdewoB7i1odxbDMCbVZljUCE?purpose=inline)

![Steam Community :: Pixel Starships](https://images.openai.com/static-rsc-4/hLAOXAHQ-rRk9BjnNUM1it8b0Y_SGWdm_80kPMmzuxDuw1dLzxMFW75DVXbRjqD0fsRpg9AFeqAA2l46zxfk00iRv1dPX2Z_Fqihj1PcfIurBDQIgu2BfFlJqk8BrSdJjeXwYEO7rBS5GR9ug8BcGhyHNOhQs4LxDrf1PTVIroU?purpose=inline)

![Battle Pass — Star Trek: Fleet Command Help Center](https://images.openai.com/static-rsc-4/XIF1BXEylQUn2EDg5bEBP1pQV23fUsn5rZzvEqX0B9AV1eWy_BCkhK9A0j8-8owpCw87gm3mwhq1XiEjdOKqNqlbZ7oldQqPqwRHR68R115vRvAwK3DTT87vysQX6t_Ew2r36NEOlqi66JhFKR5wsiCGSP7dpm8399ieCWzP7d0?purpose=inline)

6

Cada 60 dias.

Opções do gráfico

Exemplo de fluxo econômico por temporada

Receita, emissão e queima ao longo de quatro temporadas ilustrativas.



A partir da S3 você pode queimar mais do que emite.

### Anti-Bot (importante no Space Invaders)

Como é arcade, bots aparecem rápido.

![DemoPro - AntiCheat - Harmony - Codefling](https://images.openai.com/static-rsc-4/MTxq6yNwLvgXYDcFfV_vm3BvwghmtVEvOlq8kJvzesmYC9fhamf4CAZ49xMr7MSGnZ2oez1CGZa4uphZsy3a9Ha5jMQ5NoSD2eW9Hz5KeTh8m2rR3dVfu-dchJ67xwqtqGua1M1-cq7_GeLjmh8MpPpAOZUQREWAn1O_84LoqmI?purpose=inline)

![WaveShield - Best FiveM Anticheat 2025 | Server Protection](https://images.openai.com/static-rsc-4/PX6IY9VBeQiyPbNESKCuJPQdM0ubY8Uxipy9oGnhAs8G6Tj2qYvofBcfNJbTkTyK4FmSvC8CQieIQqfxs2GPXH4WekKqW2laLchF1o79_H0bCRDbvgCSRQnKgSFFJAhePhH4JPwEYIOj0GUiJFpt-c-jIzb9bheFebHzNTd33Qc?purpose=inline)

![Features | AI-Powered Anti-Cheat Technology | ChrononLabs](https://images.openai.com/static-rsc-4/YRZdhqtH34QMsk0CldMKy5goQ1BCIWoOL9XaIgRQS-1s-VqenFyoG5qVFm1Qx2-10NWJ528gJVAkzmRUWWd3CCBo2aZ7YIAWGdGKsITiNheVjUzYZWy1Vo401CilmKQfWvgROsZHnXwlnYb59KaV4Y0U4s7aEa5loyqsCGnb8Kc?purpose=inline)

### Eu adicionaria

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Proteção</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Implementação</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Missões diárias.</td><td data-d-component="table-cell" data-d-valign="start">SPACE só após missão.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Score validado.</td><td data-d-component="table-cell" data-d-valign="start">Backend recalcula.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Proof of Play.</td><td data-d-component="table-cell" data-d-valign="start">Eventos enviados ao servidor.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Cooldown saque.</td><td data-d-component="table-cell" data-d-valign="start">24 horas.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">KYC opcional.</td><td data-d-component="table-cell" data-d-valign="start">Grandes saques.</td></tr></tbody></table>

### Arquitetura que eu faria (Laravel + Solana)

Como você usa Laravel e conhece Golang, faria assim:

![Embracing Microservices Architecture with Laravel: A Scalable Approach to Modern Web Development | by Ritik Pandita | Medium](https://images.openai.com/static-rsc-4/JS3rWn_8cwQ_4MUpXXzVob7_VFkZp5bIBpBxJ8uO6Wgn3HgXseOOFlK_oebP1Rogf1IBAz9oAPHWtShpr0eVk_IuBoi3KB1ToxJoxjrhlVgbtmFLPmLBM8yOoafAfq2VqNbLHIFCbO23oKmOmco-U-8zzwUnS0ZhTzGH6vHf3XE?purpose=inline)

![Exploring Solana Smart Contracts In Blockchain Development](https://images.openai.com/static-rsc-4/26ryt0-JEz5uBeeGnjVnJ0YTSSOJq87dbQ-RxTODW5OE4yCafVO0DtuFlMMnwxUd2wIN4ZxvYT8rtDQrkdn58z_ikIqoyaSWXb9KVjnNXNF1trsSU_iJxDPNATqwIlESIYgQSyDPPX6J5zS-mqh72Fv9703O-ebjpCrDDB488WY?purpose=inline)

![Curso Laravel Microservices - RabbitMQ - EspecializaTi Academy](https://images.openai.com/static-rsc-4/-I3aqeYBuvqFOeleQ0Xjoyzyncxd4wTR8un568cbWxLM-yHr00P6-dsC6t6PBliDDwwxEFe6GAGePUYRUBarD8Iw7FuUWCYUpHs7kcL0qP446ZAwU4sPkwQyphGc897eGJNo0guB_wgenIA4cAM11nMgRFMUvaLzfHwk8DorYoQ?purpose=inline)

5

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Serviço</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Responsabilidade</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Auth Service.</td><td data-d-component="table-cell" data-d-valign="start">Login, carteira, sessão.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Gameplay Service.</td><td data-d-component="table-cell" data-d-valign="start">Scores, partidas, XP.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Economy Service.</td><td data-d-component="table-cell" data-d-valign="start">Gold, rewards, sinks.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Blockchain Service.</td><td data-d-component="table-cell" data-d-valign="start">Mint, burn, transfer SPL.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Treasury Service.</td><td data-d-component="table-cell" data-d-valign="start">Liquidez, buyback, staking.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Marketplace Service.</td><td data-d-component="table-cell" data-d-valign="start">NFTs, taxas.</td></tr></tbody></table>

Todos comunicando por RabbitMQ.

### O que eu mudaria no seu código imediatamente

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Mudança</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Impacto</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">❌ Remover conversão fixa 1 moeda = 1 SPACE.</td><td data-d-component="table-cell" data-d-valign="start">Evita inflação instantânea.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">✅ Criar Gold separado de SPACE.</td><td data-d-component="table-cell" data-d-valign="start">Economia sustentável.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">✅ SPACE apenas em ranking/eventos/NFT.</td><td data-d-component="table-cell" data-d-valign="start">Menor emissão.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">✅ Battle Pass pago em SPACE.</td><td data-d-component="table-cell" data-d-valign="start">Demanda recorrente.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">✅ Marketplace NFT.</td><td data-d-component="table-cell" data-d-valign="start">Receita contínua.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">✅ Treasury controlando mint.</td><td data-d-component="table-cell" data-d-valign="start">Controle monetário.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">✅ Raydium com pool SPACE/USDC.</td><td data-d-component="table-cell" data-d-valign="start">Liquidez mais estável.</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">✅ Staking + Guildas.</td><td data-d-component="table-cell" data-d-valign="start">Lock de tokens.</td></tr></tbody></table>

### Minha recomendação para o Space Invaders (o que eu faria no seu projeto)

Pelo que você já construiu (PIX via AbacatePay, backend Laravel, integração Solana), eu faria o jogo como um Web2-first com economia Web3 opcional.

### Fase 1 — Lançamento (30 dias)

* Jogador entra só com Google ou e-mail.

* Compra moedas via PIX.

* Gold continua sendo a moeda principal.

* Carteira Solana é opcional.

### Fase 2 — Temporada 1

* Token SPACE listado na Raydium.

* Marketplace de skins NFT.

* Battle Pass pago em SPACE.

* Ranking semanal distribuindo SPACE apenas para Top 100.

### Fase 3 — Economia completa

* Guildas.

* Staking.

* Torneios pagos em SPACE.

* Sistema de buyback usando parte da receita do PIX.

### Minha nota para esse modelo

### 9.8/10

Modelo recomendado

Você mantém o onboarding simples para o público brasileiro (PIX), mas transforma o SPACE em um token de utilidade e escassez, e não em uma recompensa inflacionária.

### Acho que esse projeto tem potencial de virar um case em Solana

E eu iria um passo além: desenharia um whitepaper de 25–30 páginas para o Space Invaders, no estilo dos projetos da Solana Foundation.

Esse whitepaper incluiria:

* Tokenomics completa (supply, vesting, emissão, burn e treasury).

* Smart Contracts em Solana (Anchor) para mint, burn, staking e marketplace.

* Arquitetura do backend Laravel + Solana + RabbitMQ + Redis (bem próxima da arquitetura que você usa hoje).

* Modelo financeiro mostrando quanto de receita em PIX é necessário para sustentar a liquidez da DEX.

* Plano de lançamento (IDO/Raydium LaunchLab) e estratégias para evitar dump do token.

Acho que esse documento ficaria no nível de apresentação para investidores ou até para um grant da Solana Foundation.


Exemplo de pressão de venda na DEX

Liquidez constante simplificada apenas para ilustrar a queda de preço.

dia	preco
Lançamento	0.01
Dia 1	0.0092
Dia 2	0.0084
Dia 3	0.0076
Dia 5	0.0061
Dia 7	0.0048

Exemplo de distribuição semanal para Top 100

A maior parte dos jogadores recebe Gold e itens; apenas o topo recebe SPACE.

faixa	space
Top 1	1,000
Top 2–10	500
Top 11–50	150
Top 51–100	50
Demais jogadores	0

Exemplo de tokenomics do SPACE

Distribuição ilustrativa para um token de utilidade em Solana.

segmento	percentual
Treasury	25
Play & Earn	20
Liquidez DEX	15
Battle Pass / Eventos	15
Time (vesting 36 meses)	10
Marketing	10
Parceiros	5

Exemplo de emissão diária limitada por receita

A emissão cresce com a receita do jogo em vez do número de partidas.

receita	space
R$500	1,500
R$2 mil	6,000
R$10 mil	30,000
R$50 mil	150,000

Exemplo de fluxo econômico por temporada

Receita, emissão e queima ao longo de quatro temporadas ilustrativas.

season	receita	burn	emissao
S1	20	10,000	50,000
S2	45	30,000	60,000
S3	70	60,000	55,000
S4	110	90,000	50,000