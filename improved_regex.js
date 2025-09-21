// Script para desenvolver regex melhorado

function normalizeAccents(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase();
}

// Regex atual (com problema)
const CURRENT_REGEX = /(visitar|\bvisita\b|agendar(\s+uma)?\s+visita|marcar(\s+uma)?\s+visita|ver\s+(o|a)?\s*(imovel|imóvel|casa|apartamento)\s*(pessoalmente|ao vivo)?|conhecer\s+(o|a)?\s*(imovel|imóvel|casa|apartamento)\s*pessoalmente|ir\s+(visitar|ver)\s+(o|a)?\s*(imovel|imóvel|casa|apartamento))/i;

// Regex melhorado
const IMPROVED_REGEX = /(visitar|\bvisita\b|agendar(\s+uma)?\s+visita|marcar(\s+uma)?\s+visita|ver\s+(o|a)?\s*(imovel|imóvel|casa|apartamento)\s*(pessoalmente|ao vivo)?|conhecer\s+(o|a)?\s*(imovel|imóvel|casa|apartamento)(\s*pessoalmente)?|ir\s+(visitar|ver)\s+(o|a)?\s*(imovel|imóvel|casa|apartamento)|gostaria\s+de\s+(visitar|ver\s+(o|a)?\s*(imovel|imóvel|casa|apartamento))|quero\s+(visitar|conhecer)\s+(o|a)?\s*(imovel|imóvel|casa|apartamento)?)/i;

function testRegex(regex, message) {
  const normalized = normalizeAccents(message);
  return regex.test(normalized);
}

// Casos de teste
const testCases = [
  // DEVE detectar (true)
  { text: "Quero visitar a primeira casa", expected: true },
  { text: "Posso visitar essa propriedade?", expected: true },
  { text: "Gostaria de agendar uma visita", expected: true },
  { text: "Quero conhecer o imóvel", expected: true },
  { text: "Gostaria de visitar", expected: true },
  { text: "Posso fazer uma visita?", expected: true },
  { text: "Quero marcar uma visita", expected: true },
  { text: "Quero ver o apartamento pessoalmente", expected: true },
  
  // NÃO deve detectar (false)
  { text: "Quero ver mais fotos", expected: false },
  { text: "Posso ver os detalhes?", expected: false },
  { text: "Quero ver as especificações", expected: false },
  { text: "Posso conhecer mais sobre o bairro?", expected: false }
];

console.log("=== COMPARANDO REGEX ATUAL vs MELHORADO ===\n");

let currentPassed = 0;
let improvedPassed = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: "${testCase.text}"`);
  console.log(`Expected: ${testCase.expected}`);
  
  const currentResult = testRegex(CURRENT_REGEX, testCase.text);
  const improvedResult = testRegex(IMPROVED_REGEX, testCase.text);
  
  console.log(`Current Regex: ${currentResult} ${currentResult === testCase.expected ? '✅' : '❌'}`);
  console.log(`Improved Regex: ${improvedResult} ${improvedResult === testCase.expected ? '✅' : '❌'}`);
  
  if (currentResult === testCase.expected) currentPassed++;
  if (improvedResult === testCase.expected) improvedPassed++;
  
  console.log("");
});

console.log(`=== SUMMARY ===`);
console.log(`Current Regex: ${currentPassed}/${testCases.length} tests passed`);
console.log(`Improved Regex: ${improvedPassed}/${testCases.length} tests passed`);

if (improvedPassed > currentPassed) {
  console.log("\n✅ IMPROVED REGEX IS BETTER!");
  console.log("\nFinal Improved Regex:");
  console.log(IMPROVED_REGEX.toString());
}