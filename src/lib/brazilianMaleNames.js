/**
 * Classificador de Nomes Masculinos Brasileiros para filtragem de contatos e leads da Barbearia DeMattos.
 * Objetivo: Contabilizar e disparar convites da barbearia EXCLUSIVAMENTE para contatos masculinos,
 * descartando nomes femininos, empresas/comércios e contatos genéricos sem nome próprio.
 */

function stripAccents(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Tratamentos estritamente masculinos quando aparecem no início (ex: "Pastor Jadson", "Tio Demi", "Sr Carlos")
const MALE_TITLES = new Set([
  'sr', 'seu', 'dr', 'tio', 'pai', 'vovo', 'vo', 'irmao', 'pr', 'pastor', 'past',
  'bispo', 'obreiro', 'diacono', 'presbitero', 'pres', 'padre', 'frei', 'amigo', 'parceiro',
  'primo', 'cunhado', 'genro', 'sogro', 'filho', 'neto', 'sobrinho', 'compadre',
  'mestre', 'professor', 'prof', 'coronel', 'major', 'capitao', 'tenente', 'sargento',
  'sgt', 'cabo', 'soldado', 'delegado', 'vereador', 'barbeiro'
]);

// Palavras que indicam contato feminino em qualquer posição relevante ou como 1º termo
const FEMALE_INDICATORS = new Set([
  'mulher', 'esposa', 'namorada', 'noiva', 'mae', 'mamae', 'tia', 'irma', 'prima',
  'cunhada', 'sogra', 'nora', 'filha', 'neta', 'sobrinha', 'amiga', 'comadre',
  'dona', 'sra', 'srta', 'dra', 'pastora', 'obreira', 'missionaria', 'diaconisa',
  'bispa', 'madre', 'freira', 'menina', 'garota', 'moça', 'moca', 'cliente_mulher'
]);

// Termos comerciais / institucionais / genéricos que NÃO são pessoas físicas masculinas
const BUSINESS_OR_GENERIC_WORDS = new Set([
  'lead', 'whatsapp', 'contato', 'cliente', 'numero', 'desconhecido', 'sem',
  'barbearia', 'salao', 'studio', 'estudio', 'espaco', 'clinica', 'consultorio',
  'laboratorio', 'hospital', 'farmacia', 'drogaria', 'otica', 'odontologia', 'odonto',
  'auto', 'car', 'moto', 'motos', 'veiculos', 'oficina', 'mecanica', 'borracharia',
  'lavajato', 'autopecas', 'pecas', 'guincho', 'transporte', 'transportes', 'transportadora',
  'frete', 'mudancas', 'van', 'escolar', 'turismo', 'viagens', 'hotel', 'pousada', 'motel',
  'restaurante', 'pizzaria', 'lanchonete', 'hamburgueria', 'acai', 'sorveteria', 'padaria',
  'panificadora', 'confeitaria', 'doceria', 'bolo', 'bolos', 'buffet', 'bar', 'distribuidora',
  'deposito', 'adega', 'mercado', 'supermercado', 'mercearia', 'hortifruti', 'sacolao',
  'acougue', 'peixaria', 'alimentos', 'agua', 'gas', 'loja', 'magazine', 'boutique',
  'modas', 'moda', 'confecoes', 'calcados', 'papelaria', 'livraria', 'grafica', 'copiadora',
  'informatica', 'celular', 'celulares', 'assistencia', 'telecom', 'internet', 'fibra',
  'imobiliaria', 'imoveis', 'construtora', 'engenharia', 'arquitetura', 'reformas',
  'materiais', 'construcao', 'ferragens', 'madeireira', 'vidracaria', 'marmoraria',
  'serralheria', 'marcenaria', 'pintura', 'eletrica', 'hidraulica', 'dedetizadora',
  'limpeza', 'lavanderia', 'costura', 'atelie', 'amigurumis', 'maratona', 'artesanato',
  'pet', 'petshop', 'veterinaria', 'agropecuaria', 'academia', 'crossfit', 'pilates',
  'fisioterapia', 'quiropraxia', 'estetica', 'unhas', 'manicure', 'cilios', 'sobrancelha',
  'maquiagem', 'depilacao', 'escola', 'colegio', 'faculdade', 'curso', 'cursos', 'idiomas',
  'igreja', 'paroquia', 'ministerio', 'associacao', 'sindicato', 'condominio', 'edificio',
  'contabilidade', 'advocacia', 'juridico', 'seguros', 'corretora', 'banco', 'financeira',
  'consorcio', 'agencia', 'marketing', 'eventos', 'producoes', 'fotografia', 'seguranca',
  'monitoramento', 'portaria', 'prefeitura', 'secretaria', 'cartorio', 'center', 'centro',
  'grupo', 'equipe', 'time', 'oficial', 'atendimento', 'suporte', 'vendas', 'comercial',
  'financeiro', 'rh', 'sac', 'delivery', 'express', 'prime', 'vip', 'plus', 'brasil',
  'minas', 'bh', 'contagem', 'betim', 'ltda', 'eireli', 'mei', 'cia', 'space', 'vitae',
  'lubi', 'macaco'
]);

// Lista explícita de nomes femininos comuns e ambíguos no Brasil (bloqueio imediato)
const FEMALE_NAMES = new Set([
  'ana', 'anna', 'maria', 'mariana', 'marina', 'marilia', 'marilene', 'marilza', 'marluce',
  'marli', 'marly', 'marcia', 'marta', 'martha', 'margarete', 'margarida', 'marcela', 'marcella',
  'marcele', 'marcelle', 'michele', 'michelle', 'micheli', 'mirela', 'mirella', 'miriam', 'mirian',
  'milena', 'millena', 'mikaela', 'micaela', 'monica', 'monique', 'moema', 'maisa', 'mayza',
  'maira', 'mayra', 'maite', 'manu', 'manuela', 'manoela', 'emanuele', 'emanuelly', 'emanuela',
  'julia', 'juliana', 'juliane', 'julieta', 'jussara', 'jurema', 'joana', 'joice', 'joyce',
  'jessica', 'jesica', 'jenifer', 'jennifer', 'jaqueline', 'jacqueline', 'janaina', 'janete',
  'jade', 'jamile', 'jamilly', 'josiane', 'josiele', 'josefa', 'judite',
  'camila', 'camilla', 'carla', 'carolina', 'caroline', 'carol', 'catarina', 'carmen', 'carmem',
  'cassia', 'catia', 'katia', 'cecilia', 'celia', 'celina', 'cintia', 'cinthia', 'clara',
  'clarice', 'clarissa', 'claudia', 'cleide', 'cleonice', 'conceicao', 'cristiana', 'cristiane',
  'cristina', 'cris', ' cibele', 'cibele', 'cilene', 'creuza', 'camile', 'camilly',
  'bruna', 'beatriz', 'bia', 'bianca', 'barbara', 'brenda', 'berenice', 'betania', 'bete', 'beth',
  'amanda', 'aline', 'alice', 'alicia', 'alessandra', 'alexandra', 'adriana', 'adriane', 'adriele',
  'agatha', 'agata', 'agnes', 'aide', 'alana', 'allana', 'alcione', 'alda', 'aleteia', 'amina',
  'andrea', 'andreia', 'andressa', 'ane', 'anne', 'angela', 'angelica', 'angelina', 'anita',
  'antonia', 'aparecida', 'ariane', 'ariadne', 'ariela', 'arlete', 'aurora', 'auxiliadora',
  'fernanda', 'fabiana', 'fabiane', 'fabiola', 'fatima', 'flavia', 'franciele', 'francine',
  'francisca', 'franciely', 'flora',
  'gabriela', 'gabriele', 'gabrielly', 'gabi', 'geovana', 'giovana', 'giovanna', 'gisele', 'giselle',
  'gisela', 'gislaine', 'glaucia', 'gleice', 'gloria', 'graca', 'graciele', 'graziela', 'graziele',
  'helena', 'heloisa', 'heloise', 'helga', 'helen', 'hellen', 'hortencia',
  'isabela', 'isabella', 'isabele', 'isabelly', 'isabel', 'izabel', 'izabela', 'izabella', 'izabelly',
  'isadora', 'isis', 'iris', 'ines', 'inez', 'ingrid', 'iolanda', 'ione', 'iracema', 'irene',
  'ivana', 'ivone', 'ivonete', 'ilda', 'ilza',
  'larissa', 'laura', 'lais', 'laiza', 'lana', 'lara', 'lavinia', 'lea', 'leila', 'leandra',
  'leidiane', 'leila', 'lenice', 'leticia', 'lia', 'liana', 'lidiane', 'lidia', 'ligia', 'lilian',
  'liliane', 'lina', 'linda', 'lindalva', 'lis', 'liz', 'livia', 'lorena', 'lorrane', 'lorrany',
  'lourdes', 'luana', 'luane', 'lucia', 'luciana', 'luciane', 'luciene', 'lucilene', 'lucimar',
  'lucimara', 'luisa', 'luiza', 'luzia', 'luma', 'luna', 'lurdes',
  'natalia', 'nathalia', 'naiara', 'nayara', 'nadia', 'nadir', 'naomi', 'nara', 'natacha', 'natasha',
  'neide', 'neiva', 'neli', 'nelly', 'neuza', 'neusa', 'nice', 'nicole', 'nicolly', 'nilza',
  'nina', 'noemi', 'noemia', 'norma', 'nubia',
  'patricia', 'paula', 'paola', 'paloma', 'pamela', 'poliana', 'polyana', 'priscila', 'priscilla',
  'pietra', 'penelope',
  'rafaela', 'raffaela', 'rafaella', 'raquel', 'rayssa', 'raissa', 'rayane', 'raiane', 'rebeca',
  'regiane', 'regina', 'renata', 'rita', 'roberta', 'rosa', 'rosalia', 'rosana', 'rosane',
  'rosangela', 'rose', 'roseli', 'rosilene', 'rosimeire', 'rute', 'ruth',
  'sabrina', 'samanta', 'samantha', 'samara', 'samira', 'sandra', 'sara', 'sarah', 'selma',
  'sheila', 'shirley', 'silmara', 'silvana', 'silvia', 'simone', 'sinara', 'irlene', 'sirlei',
  'solange', 'sonia', 'soraia', 'soraya', 'stefani', 'stefany', 'stephanie', 'sueli', 'suely',
  'suelen', 'suellen', 'suzana', 'susana',
  'talita', 'thalita', 'tamires', 'thamires', 'tamara', 'tania', 'tatiana', 'tatiane', 'tais',
  'thais', 'tayna', 'taina', 'tainara', 'tereza', 'teresa', 'terezinha', 'teresinha', 'tuane',
  'valeria', 'valquiria', 'vanessa', 'vania', 'vera', 'veronica', 'vilma', 'vitoria', 'victoria',
  'viviane', 'vivian', 'virginia',
  'wanda', 'wanessa', 'walkiria', 'wilma',
  'yasmin', 'yasmin', 'yasmim', 'iasmim', 'iasmin', 'iara', 'yara', 'eda', 'edna', 'edilene',
  'edneia', 'elaine', 'eliana', 'eliane', 'elis', 'elisa', 'eliza', 'elisabete', 'elizabeth',
  'elisangela', 'eloa', 'eloisa', 'elsa', 'elza', 'elzi', 'emili', 'emilly', 'emily', 'erica',
  'erika', 'ester', 'esther', 'eunice', 'eva', 'evellin', 'evelyn', 'evelin',
  'debora', 'deborah', 'deise', 'deyse', 'dalva', 'damares', 'damiana', 'daniela', 'daniele',
  'daniella', 'danielle', 'dandara', 'daria', 'darlene', 'denise', 'diana', 'dilma', 'diomar',
  'diva', 'dirce', 'doris', 'dulce', 'zelia', 'zilda', 'ule', 'zuleica', 'zuleide', 'keila',
  'kelly', 'keli', 'karen', 'karina', 'karine', 'karla', 'karoline', 'kauane', 'kaylane'
]);

// Dicionário amplo e curado de primeiros nomes e apelidos masculinos brasileiros
const MALE_NAMES = new Set([
  // A
  'abel', 'abimael', 'abner', 'abraao', 'acacio', 'adalberto', 'adailton', 'adair', 'adam', 'adao',
  'adauto', 'ademar', 'ademir', 'adenilson', 'adevaldo', 'adilson', 'adimilson', 'adolfo', 'adonis',
  'adriano', 'adriel', 'aecio', 'afonso', 'afranio', 'agamenon', 'agenor', 'agnaldo', 'agostinho',
  'aguinaldo', 'ailton', 'airton', 'ayrton', 'alan', 'allan', 'alano', 'alberto', 'albino', 'alceu',
  'alcides', 'alcimar', 'alcir', 'aldo', 'alecsandro', 'alejandro', 'alencar', 'alessandro', 'alex',
  'alexandre', 'alexsandro', 'alfredo', 'alipio', 'alisson', 'allyson', 'almir', 'aloisio', 'aluizio',
  'aluisio', 'alonso', 'altair', 'altamiro', 'altino', 'alvaro', 'amadeu', 'amado', 'amarildo',
  'amauri', 'amaury', 'americo', 'amilton', 'amintas', 'amir', 'amos', 'anastacio', 'anderson',
  'andre', 'andrei', 'andrey', 'angelo', 'anibal', 'anisio', 'anselmo', 'antenor', 'antonio',
  'aparecido', 'aparicio', 'apolonio', 'aquiles', 'araken', 'araripe', 'arcenio', 'ari', 'ary',
  'ariel', 'arildo', 'arimateia', 'ario', 'ariovaldo', 'arisio', 'aristides', 'aristoteles',
  'arlindo', 'armando', 'armindo', 'arnaldo', 'arnon', 'aroldo', 'arquimedes', 'arsenio', 'arthur',
  'artur', 'assis', 'ataide', 'atila', 'augusto', 'aureliano', 'aurelio', 'aurino', 'avelino',
  // B
  'baltazar', 'barreto', 'bartolomeu', 'basilio', 'batista', 'belmiro', 'benedito', 'benicio', 'benito',
  'benjamim', 'benjamin', 'bento', 'beraldo', 'bernardino', 'bernardo', 'beto', 'biel', 'bira',
  'bonifacio', 'botelho', 'bruno', 'brunim', 'bruninho', 'breno', 'brayan', 'bryan', 'bruce',
  // C
  'caetano', 'caio', 'kaio', 'caique', 'kaique', 'calebe', 'caleb', 'calixto', 'camilo', 'candido',
  'carlito', 'carlos', 'carlinhos', 'carmelo', 'casimiro', 'cassiano', 'cassio', 'castro', 'caua',
  'kaua', 'cauan', 'kauan', 'caue', 'kaue', 'celio', 'celso', 'cesar', 'cezar', 'charles', 'charlis',
  'cheiton', 'chico', 'christian', 'cristian', 'christopher', 'cicero', 'cid', 'cirilo', 'ciro',
  'claudemir', 'claudinei', 'claudio', 'claudionor', 'clayton', 'cleber', 'kleber', 'cleberson',
  'clecio', 'cleiton', 'cleyton', 'clemente', 'clenio', 'cleriston', 'cleto', 'cleverson', 'clodoaldo',
  'clovis', 'conrado', 'constantino', 'cosme', 'coutinho', 'crispim', 'cristiano', 'custodio',
  // D
  'dagoberto', 'dalmo', 'dalton', 'damiao', 'dan', 'daniel', 'danilo', 'dante', 'dario', 'darlan',
  'darwin', 'davi', 'david', 'deivid', 'dayvid', 'davison', 'deyvison', 'deivison', 'decio',
  'deleon', 'delfim', 'delmiro', 'demetrio', 'demi', 'denilson', 'denis', 'denys', 'deodoro',
  'derick', 'deusdedit', 'diego', 'dilson', 'dimas', 'dino', 'diogenes', 'diogo', 'dionisio',
  'dirceu', 'divino', 'djalma', 'domingos', 'domicio', 'donato', 'donizete', 'douglas', 'dudu',
  'durval',
  // E
  'eder', 'ederson', 'edgar', 'edgard', 'edielson', 'edimilson', 'edinaldo', 'edivaldo', 'edmar',
  'edmilson', 'edmundo', 'ednaldo', 'ednei', 'edson', 'edison', 'edu', 'eduardo', 'edvaldo',
  'edvan', 'edwin', 'egidio', 'elcio', 'elder', 'helder', 'eleazar', 'eli', 'elias', 'eliel',
  'elielton', 'elimar', 'elio', 'helio', 'eliseu', 'eliseo', 'elisio', 'elivaldo', 'elmo', 'eloi',
  'elomar', 'elon', 'elton', 'helton', 'elvino', 'elvis', 'emanuel', 'emerson', 'emiliano', 'emilio',
  'eneas', 'enio', 'enoque', 'enzo', 'epitacio', 'eraldo', 'erasmo', 'eri', 'eric', 'erick', 'erik',
  'erikson', 'eriberto', 'erico', 'erinaldo', 'erivan', 'ernane', 'ernani', 'ernesto', 'esdras',
  'estanislao', 'estevao', 'euclides', 'eugenio', 'euler', 'eurico', 'euripedes', 'evaldo',
  'evandro', 'evangelista', 'evaristo', 'everaldo', 'everton', 'ewerton', 'expedito', 'ezequias',
  'ezequiel',
  // F
  'fabiano', 'fabio', 'fabricio', 'fagner', 'farley', 'faustino', 'fausto', 'felicio', 'felipe',
  'filipe', 'phelipe', 'philipe', 'phillipe', 'felisberto', 'felix', 'fernando', 'fernao', 'fideles',
  'filomeno', 'firmino', 'flavio', 'florentino', 'floriano', 'fortunato', 'francisco', 'franck',
  'frank', 'franklin', 'fred', 'frederico', 'fulvio',
  // G
  'gabriel', 'galileu', 'gaspar', 'gastao', 'gaudencio', 'geison', 'jeison', 'gelcimar', 'genesio',
  'genilson', 'genival', 'genivaldo', 'geo', 'george', 'geovane', 'geovani', 'giovani', 'giovanni',
  'geraldo', 'geremias', 'germano', 'gerson', 'gervasio', 'getulio', 'gian', 'gil', 'gilberto',
  'gildasio', 'gildo', 'gilmar', 'gilson', 'gilvan', 'givaldo', 'glauber', 'glaucio', 'glauco',
  'gleidson', 'gleison', 'godofredo', 'goncalo', 'gregorio', 'gui', 'guido', 'guilherme', 'guilerme',
  'gumercindo', 'gustavo', 'gutemberg',
  // H
  'hamilton', 'haroldo', 'harley', 'heitor', 'helcio', 'helio', 'henrique', 'heraclito', 'herbert',
  'herculano', 'hercules', 'heriberto', 'hermes', 'herminio', 'hernane', 'hernani', 'higino',
  'higor', 'igor', 'hilton', 'hipolito', 'homero', 'honorato', 'horacio', 'hudson', 'hugo',
  'humberto',
  // I
  'ian', 'yan', 'icaro', 'idelfonso', 'ildefonso', 'ilson', 'ilton', 'inacio', 'inaldo', 'iran',
  'irineu', 'isaac', 'isaque', 'izaque', 'isaias', 'isidoro', 'ismael', 'israel', 'italo', 'itamar',
  'ivan', 'ivanildo', 'ivo', 'ivon',
  // J
  'jacinto', 'jackson', 'jacson', 'jaco', 'jader', 'jadson', 'jair', 'jairo', 'jailson', 'jaime',
  'jairton', 'jamerson', 'james', 'jamil', 'janio', 'janser', 'jardel', 'jarbas', 'jason', 'jean', 'jeferson',
  'jefferson', 'jefim', 'jeremias', 'jeronimo', 'jesse', 'jesuino', 'jesus', 'jhonatan', 'jonathan', 'jonatan',
  'jhonny', 'johnny', 'john', 'jonatas', 'joab', 'joao', 'joaopedro', 'joaquim', 'joca', 'joel',
  'joilson', 'jonas', 'jordao', 'jordano', 'jorge', 'jorginho', 'jose', 'josemar', 'josenildo',
  'josevaldo', 'josias', 'josiel', 'josimar', 'josue', 'juan', 'juarez', 'juca', 'juliano', 'julio',
  'junim', 'juninho', 'junior', 'jurandir', 'justino', 'juvenal', 'juventino',
  // K / L
  'kadu', 'cadu', 'kaik', 'kaique', 'kalleb', 'kaua', 'kauan', 'kayky', 'kelvin', 'kennedy', 'kevin',
  'kiko', 'kleberson', 'laercio', 'laerte', 'lailton', 'lauro', 'laurentino', 'lazaro', 'leandro',
  'leco', 'leo', 'leon', 'leonam', 'leonardo', 'leonel', 'leonidas', 'leopoldo', 'levi', 'levy',
  'lineu', 'lino', 'lorival', 'lourival', 'lorenzo', 'luan', 'luca', 'lucca', 'lucas', 'lukas',
  'luciano', 'lucio', 'luigi', 'luis', 'luiz', 'luizinho', 'lukinhas', 'lupicínio',
  // M
  'maciel', 'magno', 'maicom', 'maicon', 'maycon', 'maick', 'mailson', 'manoel', 'manuel', 'marcel', 'marcelino',
  'marcelo', 'marcio', 'marco', 'marcos', 'marcus', 'marquinhos', 'mariano', 'mario', 'marlon',
  'marllon', 'martim', 'martinho', 'mateus', 'matheus', 'matias', 'mathias', 'mauricio', 'maurilio',
  'mauro', 'max', 'maximiano', 'maximiliano', 'maxwell', 'melquisedeque', 'messias', 'micael',
  'michael', 'michel', 'miguel', 'milton', 'miqueias', 'misael', 'moacir', 'moacyr', 'modesto',
  'moises', 'murilo', 'murillo', 'mustafa',
  // N / O
  'nando', 'nandinho', 'napoleao', 'narciso', 'natan', 'nathan', 'natanael', 'natalino', 'nayan',
  'neemias', 'nei', 'ney', 'nelio', 'nelson', 'nereu', 'nestor', 'neto', 'newton', 'nicolas',
  'nikolas', 'niko', 'nildo', 'nilo', 'nilson', 'nilton', 'nivaldo', 'noe', 'nonato', 'norberto',
  'norton', 'odair', 'odilon', 'odorico', 'olavo', 'olegario', 'olimpio', 'oliver', 'omar', 'onofre',
  'orestes', 'orfeu', 'orlando', 'oscar', 'osmar', 'osorio', 'osvaldo', 'oswaldo', 'otacilio',
  'otaviano', 'otavio', 'oton', 'otoniel', 'ozeias', 'oziel',
  // P / Q / R
  'pablo', 'pascoal', 'patrick', 'patrik', 'patricio', 'paulinho', 'paulino', 'paulo', 'pedro',
  'pedrim', 'pedrinho', 'pericles', 'perseu', 'petronio', 'pietro', 'plinio', 'policarpo', 'pompeu',
  'prudente', 'quintino', 'quirino', 'rachid', 'rafael', 'raphael', 'rai', 'railsom', 'railson', 'raimundo',
  'ralf', 'ramiro', 'ramon', 'randolfo', 'ranieri', 'raul', 'reginaldo', 'regis', 'reges', 'reinaldo',
  'renan', 'renato', 'rene', 'rey', 'reynaldo', 'rhuan', 'rian', 'ryan', 'ribamar', 'ricardo',
  'richard', 'rivaldo', 'rivelino', 'roberio', 'robert', 'roberto', 'robinson', 'robson', 'rodinei',
  'rodolfo', 'rodrigo', 'roger', 'rogerio', 'rolando', 'romario', 'romeu', 'romildo', 'romualdo',
  'romulo', 'ronald', 'ronaldo', 'ronaldinho', 'ronan', 'roney', 'roni', 'ronny', 'ronilson',
  'roque', 'rosalvo', 'rubem', 'rubens', 'rudnei', 'rui', 'ruy', 'ruan',
  // S / T
  'sabino', 'sadraque', 'salomao', 'salvador', 'samuel', 'sandro', 'sandrinho', 'santiago', 'saul',
  'saulo', 'savio', 'sebastiao', 'serafim', 'sergio', 'severino', 'sidnei', 'sidney', 'silas',
  'silvano', 'silverio', 'silvio', 'simao', 'simplicio', 'sinval', 'ocrates', 'stanley', 'stenio',
  'tadeu', 'tales', 'thales', 'talisson', 'thalisson', 'tarcisio', 'taua', 'teobaldo', 'teodoro',
  'teofilo', 'theo', 'teo', 'thiago', 'tiago', 'tiberio', 'timoteo', 'tito', 'tobias', 'tomas',
  'thomas', 'tome', 'toni', 'tony', 'torquato', 'trajano', 'tulio',
  // U / V / W / Y / Z
  'ubaldo', 'ubirajara', 'ubiratan', 'uelton', 'ulisses', 'urbano', 'uriel', 'vagner', 'wagner',
  'valdecir', 'valdemar', 'waldemar', 'valdemir', 'valdir', 'waldir', 'valdo', 'valdomiro',
  'valente', 'valentim', 'valmir', 'valmor', 'valter', 'walter', 'vander', 'wander', 'vanderlei',
  'wanderley', 'venancio', 'vicente', 'victor', 'vitor', 'vinicio', 'vinicius', 'vinycius', 'virgilio',
  'vitinho', 'vivaldo', 'vladimir', 'walace', 'wallace', 'walisson', 'wallisson', 'warley',
  'washington', 'weliton', 'welington', 'wellington', 'welton', 'wendel', 'wendell', 'weslei',
  'wesley', 'wilker', 'william', 'willian', 'wilson', 'wladimir', 'xavier', 'yan', 'yago', 'iago',
  'yuri', 'iuri', 'zacarias', 'zaqueu', 'ze', 'zenon', 'zezinho', 'ziraldo'
]);

/**
 * Retorna true APENAS se o nome do contato representar claramente uma pessoa do sexo masculino.
 * Exclui mulheres, casais onde o 1º nome é feminino, comércios/serviços e números/leads sem nome.
 */
export function isBrazilianMaleContactName(rawName) {
  if (!rawName || typeof rawName !== 'string') return false;

  // Limpar emojis, pontuação e números isolados, preservando letras e espaços
  const cleaned = stripAccents(rawName)
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 2) return false;

  const tokens = cleaned.split(' ').filter(Boolean);
  if (tokens.length === 0) return false;

  // 1. Se qualquer palavra for indicador explícito feminino ("Cliente Mulher", "Esposa", "Mãe", "Tia", "Dra") -> FALSO
  for (const tk of tokens) {
    if (FEMALE_INDICATORS.has(tk)) return false;
  }

  // 2. Se o 1º termo for palavra genérica/comercial sem título masculino ("Space Car", "Vitae Center", "Cliente Rio Negro", "Van Escolar") -> FALSO
  const first = tokens[0];
  if (BUSINESS_OR_GENERIC_WORDS.has(first)) return false;

  // Se todos os tokens forem comerciais ou se houver termo comercial forte no 2º termo sem nome masculino no 1º
  if (FEMALE_NAMES.has(first)) return false;

  // 3. Caso comece com título masculino ("Pastor Jadson", "Tio Demi", "Bispo Adriano", "Pai Do Artur", "Genro Do Rodrigo")
  if (MALE_TITLES.has(first)) {
    // Verificar se o próximo nome próprio (ignorando preposições 'do', 'da', 'de') não é feminino (ex: "Pastor Elzi" -> Elzi é feminino!)
    const nextContentTokens = tokens.slice(1).filter(t => !['de', 'da', 'do', 'dos', 'das', 'e'].includes(t));
    if (nextContentTokens.length === 0) return true; // Ex: "Barbeiro", "Amigo"
    const targetName = nextContentTokens[0];
    if (FEMALE_NAMES.has(targetName) || FEMALE_INDICATORS.has(targetName)) return false;
    return true;
  }

  // 4. Se o 1º nome está no dicionário masculino curado (e o 2º não é empresa óbvia tipo "Lubi Alimentos" — já que Lubi não está no dicionário!)
  if (MALE_NAMES.has(first)) {
    return true;
  }

  // 5. Tratamento de nomes compostos colados (ex: "JoãoPedro" -> "joaopedro", "JoseCarlos")
  for (const malePrefix of ['joao', 'jose', 'luiz', 'luis', 'marco', 'marcos', 'paulo', 'pedro', 'carlos']) {
    if (first.startsWith(malePrefix) && first.length >= malePrefix.length + 3) {
      const rest = first.slice(malePrefix.length);
      if (!FEMALE_NAMES.has(rest)) return true;
    }
  }

  return false;
}

/**
 * Extrai um primeiro nome limpo e amigável (sem emojis ou prefixos como "Amigo", "Cliente") para saudação personalizada.
 */
export function extractCleanFirstName(rawName) {
  if (!rawName || typeof rawName !== 'string') return 'Amigo';
  // Remover emojis e símbolos mantendo letras acentuadas
  const cleanWords = rawName
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  if (cleanWords.length === 0) return 'Amigo';

  const firstLower = stripAccents(cleanWords[0]).toLowerCase();
  if (['amigo', 'cliente', 'irmao', 'parceiro', 'vizinho'].includes(firstLower) && cleanWords.length > 1) {
    const second = cleanWords[1];
    return second.charAt(0).toUpperCase() + second.slice(1).toLowerCase();
  }

  const chosen = cleanWords[0];
  return chosen.charAt(0).toUpperCase() + chosen.slice(1);
}

