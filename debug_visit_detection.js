// Script para debugar a detecção de visitas no CasaBot

// Codigo atual do sistema
const VISIT_KEYWORDS_REGEX = /(visitar|\bvisita\b|agendar(\s+uma)?\s+visita|marcar(\s+uma)?\s+visita|ver\s+(o|a)?\s*(imovel|imóvel|casa|apartamento)\s*(pessoalmente|ao vivo)?|conhecer\s+(o|a)?\s*(imovel|imóvel|casa|apartamento)\s*pessoalmente|ir\s+(visitar|ver)\s+(o|a)?\s*(imovel|imóvel|casa|apartamento))/i;

function normalizeAccents(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase();
}

function isVisitRequest(message) {
  const normalizedMessage = normalizeAccents(message);
  console.log(`Original: "${message}"`);
  console.log(`Normalized: "${normalizedMessage}"`);
  console.log(`Regex: ${VISIT_KEYWORDS_REGEX}`);
  const result = VISIT_KEYWORDS_REGEX.test(normalizedMessage);
  console.log(`Result: ${result}`);
  console.log('---');
  return result;
}

// Casos de teste obrigatórios
const testCases = [
  // DEVE detectar (true)
  { text: "Quero visitar a primeira casa", expected: true },
  { text: "Posso visitar essa propriedade?", expected: true },
  { text: "Gostaria de agendar uma visita", expected: true },
  
  // NÃO deve detectar (false)
  { text: "Quero ver mais fotos", expected: false },
  { text: "Posso ver os detalhes?", expected: false },
  
  // Casos adicionais para teste
  { text: "Quero visitar", expected: true },
  { text: "Gostaria de visitar", expected: true },
  { text: "Posso fazer uma visita?", expected: true },
  { text: "Quero marcar uma visita", expected: true },
  { text: "Quero conhecer o imóvel", expected: true },
];

console.log("=== DEBUGGING VISIT DETECTION ===\n");

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: "${testCase.text}"`);
  const result = isVisitRequest(testCase.text);
  const passed = result === testCase.expected;
  
  if (passed) {
    console.log(`✅ PASSED - Expected: ${testCase.expected}, Got: ${result}`);
    passedTests++;
  } else {
    console.log(`❌ FAILED - Expected: ${testCase.expected}, Got: ${result}`);
  }
  console.log("");
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passedTests}/${totalTests} tests`);
console.log(`Failed: ${totalTests - passedTests}/${totalTests} tests`);

if (passedTests !== totalTests) {
  console.log("\n🚨 REGEX NEEDS FIXING! 🚨");
} else {
  console.log("\n✅ All tests passed!");
}