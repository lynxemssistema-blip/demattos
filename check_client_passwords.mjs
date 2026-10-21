import { readFileSync } from 'node:fs';

const clientes = JSON.parse(readFileSync('c:\\Users\\lynx\\Documents\\barbearia-de-mattos\\migracao_demattos\\arquivos\\dados\\Cliente.json', 'utf8'));

console.log('Total clientes:', clientes.length);
const comSenha = clientes.filter(c => c.senha_canal);
console.log('Clientes com senha_canal:', comSenha.length);
comSenha.forEach(c => console.log(`- ${c.nome} (${c.email}): senha_canal='${c.senha_canal}'`));

const luan = clientes.find(c => c.email.includes('luan'));
console.log('\nLuan em Cliente:', luan);
