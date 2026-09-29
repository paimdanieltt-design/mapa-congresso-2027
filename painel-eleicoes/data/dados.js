/* DADOS FICTÍCIOS — apenas para demonstrar o modelo. Substituir por dados reais e informes da Volpatti. */
window.PAINEL = {
  turnos: { primeiro: "2026-10-04", segundo: "2026-10-25" },

  candidatos: [
    { id: "A", nome: "Candidato A", partido: "Partido 1", cor: "#2f4a33" },
    { id: "B", nome: "Candidato B", partido: "Partido 2", cor: "#9a7f47" },
    { id: "C", nome: "Candidato C", partido: "Partido 3", cor: "#6f8fb0" },
    { id: "D", nome: "Candidato D", partido: "Partido 4", cor: "#b5645a" },
    { id: "O", nome: "Outros / Nulos / Brancos", partido: "", cor: "#9aa79c" }
  ],

  /* pesquisas: valores em %, por candidato. t2 = simulação de 2º turno (A x B) */
  pesquisas: [
    { instituto: "Instituto Alfa",  data: "2026-07-08", amostra: 2000, margem: 2.2, registro: "BR-00001/2026", t1: {A:34,B:29,C:9,D:6,O:22}, t2: {A:44,B:41,O:15} },
    { instituto: "Instituto Beta",  data: "2026-07-22", amostra: 2500, margem: 2.0, registro: "BR-00002/2026", t1: {A:35,B:28,C:8,D:6,O:23}, t2: {A:45,B:40,O:15} },
    { instituto: "Instituto Gama",  data: "2026-08-05", amostra: 3000, margem: 1.8, registro: "BR-00003/2026", t1: {A:33,B:30,C:9,D:7,O:21}, t2: {A:43,B:42,O:15} },
    { instituto: "Instituto Alfa",  data: "2026-08-19", amostra: 2000, margem: 2.2, registro: "BR-00004/2026", t1: {A:32,B:31,C:10,D:7,O:20}, t2: {A:42,B:43,O:15} },
    { instituto: "Instituto Delta", data: "2026-09-02", amostra: 2800, margem: 2.0, registro: "BR-00005/2026", t1: {A:31,B:32,C:11,D:7,O:19}, t2: {A:42,B:44,O:14} },
    { instituto: "Instituto Beta",  data: "2026-09-12", amostra: 2500, margem: 2.0, registro: "BR-00006/2026", t1: {A:30,B:33,C:12,D:6,O:19}, t2: {A:41,B:45,O:14} },
    { instituto: "Instituto Gama",  data: "2026-09-19", amostra: 3000, margem: 1.8, registro: "BR-00007/2026", t1: {A:30,B:34,C:12,D:6,O:18}, t2: {A:41,B:46,O:13} },
    { instituto: "Instituto Alfa",  data: "2026-09-26", amostra: 2000, margem: 2.2, registro: "BR-00008/2026", t1: {A:29,B:35,C:12,D:7,O:17}, t2: {A:40,B:47,O:13} }
  ],

  conjuntura: {
    kpis: [
      { v: "38%", t: "aprovação do governo (fict.)" },
      { v: "12", t: "projetos em pauta na semana" },
      { v: "3", t: "temas de risco elevado" },
      { v: "5 dias", t: "para o 1º turno" }
    ],
    linha: [
      { d: "2026-09-26", t: "Fato político de exemplo", p: "Resumo curto do acontecimento e por que importa para os clientes." },
      { d: "2026-09-22", t: "Decisão de tribunal superior (exemplo)", p: "Impacto potencial sobre o calendário e sobre a regulação do setor X." },
      { d: "2026-09-15", t: "Debate entre candidatos (exemplo)", p: "Principais pontos e movimentação nas pesquisas em seguida." },
      { d: "2026-09-01", t: "Início da propaganda eleitoral gratuita (exemplo)", p: "Tempo de TV por candidatura e efeitos esperados." }
    ],
    riscos: [
      { tema: "Reforma tributária — regulamentação", nivel: "alto",  nota: "Texto em disputa entre Executivo e relatoria." },
      { tema: "Orçamento 2027",                     nivel: "medio", nota: "Emendas e regra fiscal no centro da negociação." },
      { tema: "Agenda regulatória do setor X",      nivel: "medio", nota: "Consulta pública aberta até outubro." },
      { tema: "Judicialização eleitoral",           nivel: "baixo", nota: "Sem casos relevantes no momento." }
    ]
  },

  congresso: {
    camara: { total: 513, partidos: [["Partido A",92],["Partido B",81],["Partido C",64],["Partido D",52],["Partido E",47],["Partido F",42],["Partido G",38],["Partido H",33],["Partido I",29],["Demais",35]] },
    senado: { total: 81,  partidos: [["Partido A",14],["Partido B",12],["Partido C",11],["Partido D",9],["Partido E",8],["Partido F",7],["Partido G",6],["Demais",14]] },
    renovacao: { camara: 513, senado: 54 },
    espectro: { camara: {"Esquerda":88,"Centro-esquerda":74,"Centro":150,"Centro-direita":96,"Direita":105}, senado: {"Esquerda":10,"Centro-esquerda":14,"Centro":28,"Centro-direita":16,"Direita":13} }
  },

  /* [sigla, nome, região, coluna, linha] — cartograma em quadrados */
  ufs: [
    ["RR","Roraima","Norte",3,0],["AP","Amapá","Norte",4,0],
    ["AM","Amazonas","Norte",2,1],["PA","Pará","Norte",3,1],["MA","Maranhão","Nordeste",4,1],["CE","Ceará","Nordeste",5,1],["RN","Rio Grande do Norte","Nordeste",6,1],
    ["AC","Acre","Norte",1,2],["RO","Rondônia","Norte",2,2],["MT","Mato Grosso","Centro-Oeste",3,2],["TO","Tocantins","Norte",4,2],["PI","Piauí","Nordeste",5,2],["PB","Paraíba","Nordeste",6,2],
    ["MS","Mato Grosso do Sul","Centro-Oeste",2,3],["GO","Goiás","Centro-Oeste",3,3],["DF","Distrito Federal","Centro-Oeste",4,3],["BA","Bahia","Nordeste",5,3],["PE","Pernambuco","Nordeste",6,3],["AL","Alagoas","Nordeste",7,3],
    ["SP","São Paulo","Sudeste",3,4],["MG","Minas Gerais","Sudeste",4,4],["ES","Espírito Santo","Sudeste",5,4],["SE","Sergipe","Nordeste",7,4],
    ["PR","Paraná","Sul",3,5],["RJ","Rio de Janeiro","Sudeste",4,5],
    ["SC","Santa Catarina","Sul",3,6],
    ["RS","Rio Grande do Sul","Sul",3,7]
  ],

  informes: [
    { aba: "presidencial", tipo: "Informe", data: "2026-09-28", titulo: "Cenário do 1º turno: o que muda na última semana", resumo: "Leitura das movimentações recentes e dos cenários de 2º turno.", url: "#" },
    { aba: "pesquisas",    tipo: "Nota técnica", data: "2026-09-26", titulo: "Como ler as pesquisas: margem, registro e ponderação", resumo: "Guia rápido para interpretar as pesquisas registradas no TSE.", url: "#" },
    { aba: "conjuntura",   tipo: "Boletim", data: "2026-09-25", titulo: "Boletim semanal de conjuntura", resumo: "Principais fatos políticos, agenda do Congresso e do Judiciário.", url: "#" },
    { aba: "congresso",    tipo: "Informe", data: "2026-09-20", titulo: "Composição provável do Congresso em 2027", resumo: "Projeção das bancadas e impacto na pauta legislativa.", url: "#" },
    { aba: "governos",     tipo: "Informe", data: "2026-09-18", titulo: "Disputas estaduais mais competitivas", resumo: "Estados em que o resultado está aberto e por quê.", url: "#" },
    { aba: "presidencial", tipo: "Nota técnica", data: "2026-09-10", titulo: "Regras do 2º turno e calendário eleitoral", resumo: "Prazos, propaganda e possíveis judicializações.", url: "#" },
    { aba: "conjuntura",   tipo: "Boletim", data: "2026-09-18", titulo: "Boletim semanal de conjuntura", resumo: "Edição anterior — exemplo de arquivo histórico.", url: "#" }
  ]
};

/* Governos estaduais (fictício): gerado de forma determinística a partir da lista de UFs */
(() => {
  const P = window.PAINEL, ids = ["A","B","C","D"];
  P.governos = P.ufs.map(([uf,nome,regiao], i) => {
    const lider = ids[(i * 7 + (i % 3)) % 4], margem = 2 + ((i * 5) % 17);
    return { uf, nome, regiao, governador: "[a preencher]", partidoGov: "Partido " + (1 + (i % 6)),
      reeleicao: i % 3 !== 0 ? "Disputa reeleição" : "Não pode reeleger", lider, margem,
      competitividade: margem < 6 ? "Alta" : margem < 12 ? "Média" : "Baixa", presidencial: ids[(i * 3 + 1) % 3] };
  });
})();
