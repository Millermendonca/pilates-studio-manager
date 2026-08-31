async function runTests() {
  const baseUrl = 'http://localhost:3000';

  console.log('--- TESTE 1: Cadastro Rápido (Nome + Telefone) ---');
  const testPhone = '22999887766';
  const resCreate = await fetch(`${baseUrl}/api/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Aluno Teste Rapido',
      phone: testPhone,
      planName: '2x por Semana',
      monthlyFee: 340.0,
    }),
  });
  const created = await resCreate.json();
  console.log('Create response status:', resCreate.status, 'Created ID:', created.id);
  if (!resCreate.ok) throw new Error(JSON.stringify(created));

  console.log('\n--- TESTE 2: Busca de Matrícula por Telefone ---');
  const resLookup = await fetch(`${baseUrl}/api/matricula/lookup?phone=${testPhone}`);
  const lookupData = await resLookup.json();
  console.log('Lookup found:', lookupData.found, 'Student Name:', lookupData.student?.name);
  if (!lookupData.found) throw new Error('Aluno não encontrado no lookup!');

  console.log('\n--- TESTE 3: Auto-Save em Tempo Real (Salvar Endereço e Anamnese) ---');
  const resSaveStep = await fetch(`${baseUrl}/api/matricula/save-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: created.id,
      data: {
        cep: '28010-000',
        address: 'Rua de Teste, 100',
        goals: 'Fortalecimento e alívio de dor',
        injuries: 'Hérnia lombar L5',
        painLevel: 4,
      },
    }),
  });
  const saveStepData = await resSaveStep.json();
  console.log('Save-step success:', saveStepData.success, 'Address:', saveStepData.student?.address);
  if (!saveStepData.success) throw new Error('Falha no save-step!');

  console.log('\n--- TESTE 4: Limpeza do Aluno de Teste ---');
  const resDel = await fetch(`${baseUrl}/api/students/${created.id}`, { method: 'DELETE' });
  console.log('Delete status:', resDel.status);

  console.log('\n✅ TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
}

runTests().catch(console.error);
