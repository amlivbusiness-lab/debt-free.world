/* ══════════════════════════════════════════════════════════════════════════
   DEBT-FREE.WORLD — CANONICAL SUPPORT DATA (single source of truth)
   window.SUPPORT_DATA — read by: /member/index.html, /member-free/index.html,
   /onboarding-debt-free.html. Do NOT inline copies elsewhere (drift-proof).
   Country entries verified against national sources. Objects: {name,url?,desc}.
   Note: Brazil = Consumidor.gov.br + Registrato only (Novo Desenrola is a
   temporary MP sunsetting 14.9.2026 with no standalone portal — excluded so the
   "verified" badge stays truthful). _other = generic fallback (no badge).
   ══════════════════════════════════════════════════════════════════════════ */
window.SUPPORT_DATA = {
  'Finland':[{name:'Takuusäätiö',url:'takuusaatio.fi',desc:'Guarantees and free debt counselling.'},{name:'Talous- ja velkaneuvonta (oikeusapu.fi)',url:'oikeusapu.fi',desc:'Statutory free debt counselling.'},{name:'Kela',url:'kela.fi',desc:'Benefits and financial support.'}],
  'Sweden':[{name:'Budget- och skuldrådgivning',desc:'Free municipal debt counselling, by law — contact your kommun.'},{name:'Kronofogden',url:'kronofogden.se',desc:'Debt enforcement and voluntary payment plans.'},{name:'Konsumentverket',url:'konsumentverket.se',desc:'Consumer guidance.'}],
  'Norway':[{name:'NAV',url:'nav.no',desc:'Benefits, unemployment and social support.'},{name:'Kommunal gjeldsrådgivning',desc:'Free municipal debt counselling, by law.'},{name:'Forbrukerrådet',url:'forbrukerradet.no',desc:'Consumer rights.'}],
  'Denmark':[{name:'Gældsrådgivning Danmark',url:'gaeldsraadgivning.dk',desc:'Free debt counselling.'},{name:'Forbrugerrådet Tænk',url:'taenk.dk',desc:'Consumer advice.'},{name:'Kommunal gældsrådgivning',desc:'Contact your local municipality.'}],
  'Germany':[{name:'Caritas Schuldnerberatung',url:'caritas.de',desc:'Free debt counselling.'},{name:'Verbraucherzentrale',url:'verbraucherzentrale.de',desc:'Consumer advice centres.'},{name:'Diakonie',url:'diakonie.de',desc:'Social support including debt help.'}],
  'Netherlands':[{name:'Nibud',url:'nibud.nl',desc:'Budget and debt guidance.'},{name:'Schuldhulpverlening via gemeente',desc:'Free municipal debt help.'},{name:'NVVK',url:'nvvk.eu',desc:'Debt restructuring.'}],
  'Belgium':[{name:'OCMW / CPAS',desc:'Public social welfare centre — contact locally.'},{name:'CAW',url:'caw.be',desc:'Free social and financial support.'}],
  'France':[{name:'CRESUS',url:'cresus.fr',desc:'Debt mediation and prevention.'},{name:'CCAS',desc:'Municipal social support centres.'},{name:'CDAD',desc:'Free local legal and financial advice.'}],
  'Spain':[{name:'ADICAE',url:'adicae.net',desc:'Consumer and debt advocacy.'},{name:'Cáritas',url:'caritas.es',desc:'Social and financial support.'},{name:'OCU',url:'ocu.org',desc:'Consumer rights.'}],
  'Portugal':[{name:'DECO',url:'deco.proteste.pt',desc:'Consumer and debt advice.'},{name:'Santa Casa da Misericórdia',desc:'Social support.'}],
  'Italy':[{name:'Adiconsum',url:'adiconsum.it',desc:'Consumer and debt support.'},{name:'Caritas',url:'caritas.it',desc:'Social support.'}],
  'Poland':[{name:'Federacja Konsumentów',url:'federacja-konsumentow.org.pl',desc:'Consumer rights and debt advice.'},{name:'UOKiK',url:'uokik.gov.pl',desc:'Consumer protection office.'}],
  'Czech Republic':[{name:'Poradna při finanční tísni',url:'financnitisen.cz',desc:'Free debt counselling.'},{name:'dTest',url:'dtest.cz',desc:'Consumer advice.'}],
  'Estonia':[{name:'Tarbijakaitse',url:'tarbijakaitse.ee',desc:'Consumer and financial protection.'},{name:'Kohalik omavalitsus',desc:'Local municipality debt support.'}],
  'Latvia':[{name:'PTAC',url:'ptac.gov.lv',desc:'Consumer rights and financial guidance.'},{name:'Sociālais dienests',desc:'Municipal social support.'}],
  'Lithuania':[{name:'VVTAT',url:'vvtat.lt',desc:'State consumer rights protection.'},{name:'Savivaldybės socialinė tarnyba',desc:'Municipal social support.'}],
  'Hungary':[{name:'MNB Pénzügyi Navigátor',url:'mnb.hu/penzugyinavigator',desc:'Central bank financial guidance and dispute resolution.'},{name:'Fogyasztóvédelem',url:'fogyasztovedelem.kormany.hu',desc:'Consumer protection.'}],
  'Romania':[{name:'ANPC',url:'anpc.ro',desc:'National Consumer Protection Authority.'},{name:'Caritas Romania',url:'caritas.ro',desc:'Social support.'}],
  'Croatia':[{name:'HANFA',url:'hanfa.hr',desc:'Financial regulation authority.'},{name:'Potrošač.hr',url:'potrosac.hr',desc:'Consumer rights.'}],
  'United Kingdom':[{name:'StepChange',url:'stepchange.org',desc:'Free debt charity — full debt management.'},{name:'National Debtline',url:'nationaldebtline.org',desc:'Free phone and online advice.'},{name:'Citizens Advice',url:'citizensadvice.org.uk',desc:'Free legal and financial guidance.'}],
  'Ireland':[{name:'MABS',url:'mabs.ie',desc:'Money Advice and Budgeting Service, free.'},{name:'ISI',url:'isi.gov.ie',desc:'Insolvency Service of Ireland — formal options.'},{name:'Citizens Information',url:'citizensinformation.ie',desc:'Benefits and rights.'}],
  'Austria':[{name:'Schuldnerberatung',url:'schuldenberatung.at',desc:'Free public debt counselling.'},{name:'AK Konsumentenschutz',url:'arbeiterkammer.at',desc:'Free consumer and debt advice.'}],
  'Switzerland':[{name:'Schuldenberatung Schweiz',url:'schulden.ch',desc:'Free debt counselling.'}],
  'Greece':[{name:'Εξωδικαστικός Μηχανισμός',url:'keyd.gov.gr',desc:'Out-of-court debt settlement mechanism.'},{name:'Συνήγορος του Καταναλωτή',url:'synigoroskatanaloti.gr',desc:'Consumer ombudsman.'}],
  'United States':[{name:'NFCC',url:'nfcc.org',desc:'Find local nonprofit credit counselling.'},{name:'CFPB',url:'consumerfinance.gov',desc:'Consumer Financial Protection Bureau.'},{name:'211.org',url:'211.org',desc:'Local social services including financial help.'}],
  'Canada':[{name:'Credit Counselling Canada',url:'creditcounsellingcanada.ca',desc:'Accredited nonprofit agencies.'},{name:'FCAC',url:'canada.ca/fcac',desc:'Financial Consumer Agency of Canada.'}],
  'Australia':[{name:'National Debt Helpline',url:'ndh.org.au',desc:'Free phone advice from financial counsellors.'},{name:'MoneySmart',url:'moneysmart.gov.au',desc:'Government financial guidance.'}],
  'New Zealand':[{name:'MoneyTalks',url:'moneytalks.co.nz',desc:'Free financial helpline.'},{name:'Sorted',url:'sorted.org.nz',desc:'Free budgeting tools and guides.'}],
  'Brazil':[{name:'Consumidor.gov.br',url:'consumidor.gov.br',desc:'Official consumer dispute platform.'},{name:'Registrato (Banco Central)',url:'registrato.bcb.gov.br',desc:'See all debts registered in your name.'}],
  'Mexico':[{name:'PROFECO',url:'profeco.gob.mx',desc:'Consumer protection.'},{name:'CONDUSEF',url:'condusef.gob.mx',desc:'Financial services protection.'}],
  'India':[{name:'RBI Ombudsman',url:'cms.rbi.org.in',desc:'Banking dispute resolution.'}],
  'Indonesia':[{name:'OJK',url:'ojk.go.id',desc:'Financial Services Authority.'},{name:'YLKI',url:'ylki.or.id',desc:'Consumer protection.'}],
  'Philippines':[{name:'BSP Consumer Assistance',url:'bsp.gov.ph',desc:'Central bank consumer help.'},{name:'SEC',url:'sec.gov.ph',desc:'Lending regulation.'}],
  'South Africa':[{name:'National Debt Counsellors Association',url:'ndca.org.za',desc:'Registered debt counsellors.'},{name:'DebtBusters',url:'debtbusters.co.za',desc:'Debt counselling.'}],
  'Bulgaria':[{name:'Commission for Consumer Protection (KZP)',url:'kzp.bg',desc:'State consumer protection body.'},{name:'BNB Payment Disputes Conciliation Commission',url:'bnb.bg',desc:'Free out-of-court financial dispute resolution.'}],
  'Slovakia':[{name:'Centrum pravnej pomoci',url:'centrumpravnejpomoci.sk',desc:'State legal aid; personal bankruptcy help.'},{name:'Poradne pre ludi v dlhoch (free debt-advice network)',url:'pomahamedlznikom.sk',desc:'Free financial, legal, psychological counselling.'}],
'Argentina': [
  { name: 'Banco Central de la República Argentina — Usuarios Financieros', url: 'bcra.gob.ar', desc: 'Argentina\'s central bank runs a free channel for financial-services users to raise problems with banks and lenders (interest, charges, abusive collection). For broader consumer disputes, the national Defensa del Consumidor (argentina.gob.ar) also offers free conciliation.' }
],

'Singapore': [
  { name: 'Credit Counselling Singapore (CCS)', url: 'ccs.org.sg', desc: 'A registered charity and non-profit (since 2004) offering free debt-management talks and credit counselling, and the only agency running the Debt Management Programme, which consolidates unsecured bank debts into one restructured repayment plan.' }
],

'Malaysia': [
  { name: 'AKPK — Agensi Kaunseling dan Pengurusan Kredit', url: 'akpk.org.my', desc: 'The Credit Counselling and Debt Management Agency set up by the central bank, Bank Negara Malaysia. Provides free financial counselling and a Debt Management Programme that restructures unsecured debts with participating banks — a route to avoid bankruptcy.' }
],

'Thailand': [
  { name: 'Debt Clinic by SAM (คลินิกแก้หนี้)', url: 'debtclinicbysam.com', desc: 'A Bank of Thailand-initiated debt-restructuring programme (since 2017) run by the state-owned Sukhumvit Asset Management. A one-stop centre that consolidates unsecured personal debt (credit cards, personal loans) up to THB 2 million into a low-interest plan of up to 10 years. Hotline 1443.' }
],

'United Arab Emirates': [
  { name: 'Sanadak', url: 'sanadak.gov.ae', desc: 'The UAE\'s independent financial and insurance Ombudsman Unit, established by the Central Bank of the UAE (operating since 2024). Provides free, impartial resolution of complaints against banks and lenders — including disputes over loans, charges and salary-deduction limits — as an alternative to going to court.' }
],

'Kenya': [
  { name: 'Office of the Official Receiver in Insolvency (Business Registration Service)', url: 'brs.go.ke', desc: 'The Kenyan government body that administers personal insolvency under the Insolvency Act 2015, including the no-asset procedure, voluntary arrangements and bankruptcy. Kenya has no dedicated free debt-counselling charity, so this is the official statutory starting point for individual debt relief.' }
],
};
