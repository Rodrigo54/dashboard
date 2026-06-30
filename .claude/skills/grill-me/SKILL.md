---
name: grill-me
description: Entrevista o usuário de forma incansável e estruturada sobre um plano, feature ou decisão de design ANTES de implementar, até chegar a um entendimento comum. Use sempre que o usuário pedir "me entreviste", "grill me", "me questione", "vamos alinhar o plano", "me ajude a fechar os detalhes", ou quando apresentar uma ideia ainda vaga/ambígua que precisa virar uma especificação concreta antes de escrever código. Acione também quando o usuário descrever um trabalho com muitas decisões em aberto, dependências entre escolhas, ou trade-offs não resolvidos — mesmo que ele não peça explicitamente uma entrevista. Não é para tarefas já bem definidas onde basta implementar.
model: claude-sonnet-4-6
---

# Grill Me

Conduza uma entrevista rigorosa para transformar uma ideia vaga em um entendimento compartilhado e acionável. O objetivo não é "tirar um briefing" — é **estressar o plano**: encontrar as decisões que ainda não foram tomadas, as suposições escondidas e as dependências entre escolhas, resolvendo-as uma a uma até que você e o usuário tenham o mesmo modelo mental do que será feito.

Toda a interação é em **português**. Esta skill é puramente conversacional: ela **não** gera arquivos nem escreve specs ao final. O artefato é o alinhamento na cabeça das duas partes.

## Princípios

**Uma pergunta de cada vez.** Nunca despeje uma lista de perguntas. Pessoas respondem melhor e pensam com mais profundidade quando focam em uma decisão por vez. Faça a pergunta, espere a resposta, processe, então faça a próxima. Isso também permite que cada resposta redirecione as perguntas seguintes — algo impossível num questionário de uma vez só.

**Sempre ofereça 3 opções de resposta, com uma recomendada.** Para cada pergunta, apresente **três** opções concretas e mutuamente excludentes, marcando claramente qual você recomenda com uma justificativa curta (1-2 frases do *porquê*). Três opções dão ao usuário uma escala real de escolha sem sobrecarregar — tipicamente: a recomendada, uma alternativa razoável, e uma terceira que cobre outro trade-off ou um extremo (mais simples/mais completo). Isso transforma a entrevista de um interrogatório em vácuo numa conversa entre dois engenheiros: o usuário pode só concordar ("a 1", "isso"), escolher outra, ajustar uma delas, ou propor algo fora da lista — e qualquer uma dessas respostas é rápida de dar. O usuário sempre pode responder com algo que não está entre as opções. Um bom formato:

> **Pergunta:** Onde o cache de sessão deve viver?
> 1. **Serviço dedicado** *(recomendado)* — o cache é estado de infraestrutura, não de domínio; isola a responsabilidade e não polui o store com algo que nenhuma tela observa.
> 2. **Slice NGXS** — centraliza no store já existente, mas mistura estado de infraestrutura com estado de domínio.
> 3. **Signal local no componente que consome** — mais simples de tudo, mas não compartilha o cache entre telas e tende a duplicar requisições.

**Explore o código antes de perguntar.** Se uma pergunta pode ser respondida lendo o código-fonte, leia o código em vez de perguntar. Perguntar algo que está escrito no repositório desperdiça o tempo do usuário e mina a confiança. Use as ferramentas de busca e leitura para descobrir convenções existentes, padrões já adotados, nomes de arquivos, contratos de API, etc. Só pergunte o que o código genuinamente não responde: intenção, prioridades, trade-offs de negócio, preferências.

**Percorra a árvore de decisões em ordem de dependência.** Decisões não são uma lista plana — elas formam uma árvore. Algumas escolhas só fazem sentido depois que outras foram fixadas (não adianta discutir o layout do componente antes de decidir se ele existe). Comece pelas decisões-raiz (as que mais ramificam o resto), resolva cada uma, e deixe que ela abra ou poderão as perguntas seguintes. Quando uma resposta tornar um ramo inteiro irrelevante, pule esse ramo.

**Seja incansável, mas não burocrático.** Continue cavando enquanto houver ambiguidade material — escopo, comportamento em casos de borda, contratos de dados, estados de erro/loading, impacto em código existente, o que está *fora* de escopo. Pare quando o entendimento estiver convergido o suficiente para implementar sem adivinhar. Não invente perguntas só para parecer minucioso; se algo é óbvio ou já foi acordado, siga em frente.

## Fluxo

1. **Orientação.** Antes da primeira pergunta, explore rapidamente o contexto: o que o usuário disse, o estado relevante do repositório, as convenções já existentes. Forme uma hipótese do que ele quer construir e quais são as grandes decisões em aberto.

2. **Mapeie a raiz.** Identifique a decisão de maior alcance — aquela que mais condiciona as outras (geralmente: "isto é mesmo o problema certo a resolver?" ou "qual a abordagem geral?"). Comece por ela.

3. **Itere.** Para cada nó: explore o código se ajudar, faça **uma** pergunta com sua recomendação e o porquê, absorva a resposta, e escolha o próximo nó com base no que foi decidido. Periodicamente, faça um *check-in* curto resumindo o que já foi acordado — isso confirma o entendimento comum e dá ao usuário a chance de corrigir o rumo cedo.

4. **Convergência.** Quando as decisões materiais estiverem fechadas, faça um resumo final do entendimento compartilhado: o que será feito, as decisões-chave e suas razões, e o que ficou explicitamente fora de escopo. Pergunte se está tudo alinhado. Se sim, a entrevista terminou — e o usuário pode seguir para a implementação com confiança.

## Antipadrões a evitar

- **Perguntas em lote.** Mata o foco e impede que respostas redirecionem a conversa.
- **Perguntar o que o código responde.** Leia primeiro. Sempre.
- **Perguntas sem opções ou sem recomendação.** Empurra todo o trabalho cognitivo para o usuário; ofereça sempre 3 opções e indique a recomendada como ponto de partida.
- **Opções artificiais.** Não invente uma terceira opção só para fechar a conta de três. Se houver genuinamente apenas duas saídas válidas, diga isso — mas, em geral, há um terceiro caminho que vale a pena nomear (mais simples, mais completo, ou outro trade-off).
- **Falsa minúcia.** Encher de perguntas triviais quando o entendimento já convergiu. Saiba parar.
- **Aceitar respostas vagas.** Se o usuário responder de forma ambígua numa decisão que importa, aprofunde — é justamente aí que o alinhamento se ganha ou se perde.
