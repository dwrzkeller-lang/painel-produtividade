# Painel de Produtividade

**Demonstração online:** https://dwrzkeller-lang.github.io/painel-produtividade/  
Entre com `admin@demo.com` e a senha `demo123`. Todos os dados são fictícios.

Painel para empresas de serviços de campo acompanharem, por contrato, a meta
e a produção de cada equipe no mês, e para a diretoria comparar o resultado de
todos os contratos com o orçamento do ano.

Esta pasta vem pronta para demonstração: 4 contratos inventados, com equipes,
produção diária de julho a setembro de 2026 e orçamento do ano. Nenhum número
é de empresa real.

## Abrir

Dê dois cliques em `painel.html`. Abre no navegador, sem instalar nada e sem
internet.

Se preferir abrir por um endereço (`http://localhost:8080`), use
`ABRIR-DEMONSTRACAO.bat`. Para parar, feche a janela preta.

### Contas (senha `demo123`)

| Conta | Perfil | O que pode fazer |
|---|---|---|
| admin@demo.com | Administrador | tudo, inclusive a Administração |
| diretoria@demo.com | Diretoria | vê todos os contratos e o gerencial, sem editar |
| gerente@demo.com | Gerente | vê todos os contratos e o gerencial, sem editar |
| controller@demo.com | Controller | edita os contratos Alfa e Beta |

Em "Esqueci minha senha" a tela mostra a senha da demonstração.

### Voltar aos dados originais

Tudo o que for salvo fica guardado no navegador de quem está usando. Para
apagar as mudanças e voltar aos números de fábrica: entre como administrador,
abra **Administração**, aba **Contratos e nuvem**, botão **Voltar aos dados
originais**.

## Os 4 contratos

| Contrato | Serviço | Situação no ano |
|---|---|---|
| Alfa | Manutenção de redes, Regional Norte | acima do orçamento |
| Beta | Expansão e ligações, Regional Sul | acima do orçamento |
| Gama | Poda e roçada, Regional Oeste | abaixo do orçamento, fora da política |
| Delta | Inspeção e religação, Regional Leste | acima do orçamento |

## Telas

**Entrada e escolha do contrato.** Cada contrato aparece com produção, meta
acumulada, desvio, avanço no mês e a curva dos últimos dias.

**Painel do contrato.** Indicadores do mês, tabela por equipe com situação,
ranking de desvio, produção diária e por equipe. Comentário por equipe e por
dia. Editor do projeto com importação de planilha de produção.

**Cards de equipe.** Ficha de acompanhamento (números do mês, curva
acumulada, plano de ação, responsáveis, fotos da vistoria) e resumo para a
equipe de campo com quanto produzir por dia até o fechamento. Os dois viram
imagem PNG, uma equipe ou todas de uma vez.

**Acompanhamento gerencial.** Orçamento anual, forecast revisado (3+9, 6+6,
9+3) e realizado dos meses fechados, no formato de DRE gerencial: receita
bruta, deduções, receita líquida, custos diretos, margem de contribuição,
despesas indiretas e EBITDA. Visão do mês, acumulado no ano ou projeção do
ano. Prévia do mês corrente pela produção lançada. Resultado por contrato,
evolução mensal e a lista de desvios fora da política com justificativa,
responsável e prazo.

Política de desvio usada em todas as telas: desvio desfavorável até 3% está
dentro da política; de 3% a 7% pede atenção; acima de 7% exige justificativa
e plano de ação.

O orçamento, o forecast, o realizado e as justificativas são digitados em
**Orçamento e forecast** (menu do contrato ou barra do gerencial). Só grava
quando se clica em Salvar.

**Administração.** Usuários e perfis, quem está online, registro de
salvamentos, histórico de acessos e situação de cada contrato guardado.

## Usar com a nuvem da empresa

1. Crie um projeto no [Firebase](https://console.firebase.google.com) com
   Cloud Firestore e login por e-mail e senha.
2. Copie a configuração do app web para `firebase-config.js` (as instruções
   estão dentro do arquivo). Com a configuração preenchida, a demonstração se
   desliga sozinha.
3. Publique as regras de acesso de `firestore.rules`.
4. Crie o primeiro usuário no Firebase e, no Firestore, o documento
   `users/{uid}` com `{ "nome": "...", "email": "...", "role": "admin", "ativo": true }`.
   Os demais usuários são criados pela Administração.
5. Para publicar o site: `npm run build` e depois `firebase deploy --only hosting`.

## Para quem mexe no código

```
npm install
npm run teste            # regras de cálculo, rodando o código real
npm run foto             # números do painel do contrato contra a referência
npm run foto-gerencial   # números do gerencial contra a referência
npm run check            # todo arquivo que o painel carrega existe
npm run gerar-dados      # refaz os dados fictícios (usa o próprio painel)
```

Depois de `gerar-dados`, confira a tela e grave a nova referência do gerencial
com `node scripts/foto-gerencial.mjs --salvar`.

| Caminho | Conteúdo |
|---|---|
| `painel.html` | entrada, escolha de contrato, painel, cards, editores |
| `assets/js/` | lógica do painel, carregada em ordem numérica |
| `assets/gerencial/` | contas, tela e editor do acompanhamento gerencial |
| `assets/css/` | aparência; `20-identidade.css` e `21-cards-equipe.css` são a camada atual |
| `assets/demo/dados-ficticios.js` | os dados da demonstração |
| `assets/vendor/`, `assets/fonts/` | bibliotecas e fonte, funcionam sem internet |
| `firebase-config.js` | configuração da nuvem (vazia = demonstração) |
| `firestore.rules` | regras de acesso por perfil |
| `scripts/` | gerador de dados, conferências, montagem e servidor local |

Bibliotecas de terceiros: Chart.js, html2canvas e JSZip (licença MIT); fonte
Inter (SIL Open Font License).
