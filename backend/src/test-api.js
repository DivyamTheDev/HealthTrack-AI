import dotenv from 'dotenv';
import dns from 'node:dns';

// Fix for SRV DNS resolution failures on some local networks
dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

const API_URL = 'http://localhost:5000/api';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runTests = async () => {
  console.log('=== STARTING HEALTHTRACK AI INTEGRATION TESTS ===');
  let token = '';
  let patientId = '';
  let summaryId = '';

  try {
    // 1. Authenticate as Doctor
    console.log('\n1. Authenticating as clinician (dr_smith)...');
    const authRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'dr_smith', password: 'password123' })
    });

    if (!authRes.ok) {
      throw new Error(`Login failed: ${await authRes.text()}`);
    }

    const authData = await authRes.json();
    token = authData.token;
    console.log('✔ Authenticated successfully. JWT Token acquired.');

    // 2. Fetch assigned patients
    console.log('\n2. Fetching patients assigned to clinician...');
    const patientRes = await fetch(`${API_URL}/patients`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!patientRes.ok) {
      throw new Error(`Failed to fetch patients: ${await patientRes.text()}`);
    }

    const patients = await patientRes.json();
    console.log(`✔ Found ${patients.length} assigned patients:`);
    patients.forEach(p => console.log(`   - Name: ${p.name} (ID: ${p._id})`));

    const divyam = patients.find(p => p.name === 'Divyam');
    if (!divyam) {
      throw new Error('Could not find Patient "Divyam" in seeded database.');
    }
    patientId = divyam._id;
    console.log(`✔ Targeting Patient Divyam (ID: ${patientId})`);

    // 3. Add a clinical note
    console.log('\n3. Adding a new clinical note...');
    const noteRes = await fetch(`${API_URL}/clinical-notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        patientId,
        note: 'Integrating test review: Patient reports positive energy levels. High lipid panel (LDL 128) is being addressed through oatmeal diet and low butter intake.'
      })
    });

    if (!noteRes.ok) {
      throw new Error(`Failed to add clinical note: ${await noteRes.text()}`);
    }

    const note = await noteRes.json();
    console.log('✔ Clinical note added successfully. Note ID:', note._id);

    // 4. Generate AI Health Summary
    console.log('\n4. Generating AI Health Summary via Groq Llama 3...');
    const aiRes = await fetch(`${API_URL}/ai/summaries/${patientId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!aiRes.ok) {
      throw new Error(`AI generation failed: ${await aiRes.text()}`);
    }

    const summary = await aiRes.json();
    summaryId = summary._id;
    console.log('✔ AI Summary draft generated successfully.');
    console.log('--- GENERATED CONTENT ---');
    console.log(summary.summaryText);
    console.log('-------------------------');

    // 5. Approve and sign the AI Summary draft
    console.log('\n5. Approving and signing the draft summary...');
    const approveRes = await fetch(`${API_URL}/ai/summaries/${summaryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        status: 'approved',
        editedText: summary.summaryText + '\n\nAddendum (Dr. Smith): Confirmed. Patient is responsive to lifestyle changes.'
      })
    });

    if (!approveRes.ok) {
      throw new Error(`Summary review failed: ${await approveRes.text()}`);
    }

    const reviewedSummary = await approveRes.json();
    console.log(`✔ Summary review status updated: '${reviewedSummary.status}'`);
    console.log('Updated summary text:', reviewedSummary.editedText);

    // 6. Simulate laboratory webhook result ingestion
    console.log('\n6. Simulating external laboratory webhook ingestion...');
    const webhookRes = await fetch(`${API_URL}/lab/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId,
        test: 'LDL',
        value: 124,
        unit: 'mg/dL',
        date: new Date().toISOString()
      })
    });

    if (!webhookRes.ok) {
      throw new Error(`Webhook ingestion failed: ${await webhookRes.text()}`);
    }

    const webhookResult = await webhookRes.json();
    console.log('✔ Webhook response:', webhookResult.message);
    console.log(`   Ingested result: ${webhookResult.data.value} ${webhookResult.data.value > 100 ? 'mg/dL (High)' : 'mg/dL'}`);

    // 7. Verify security Audit Logs
    console.log('\n7. Retrieving system Audit Log...');
    const auditRes = await fetch(`${API_URL}/audit-logs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!auditRes.ok) {
      throw new Error(`Failed to fetch audit logs: ${await auditRes.text()}`);
    }

    const logs = await auditRes.json();
    console.log(`✔ Found ${logs.length} system audit logs. Recent actions:`);
    logs.slice(0, 10).forEach(l => {
      console.log(`   [${new Date(l.timestamp).toLocaleTimeString()}] ${l.username} (${l.role}): ${l.action} - ${l.details}`);
    });

    console.log('\n=== ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY! ✔ ===');
  } catch (error) {
    console.error('\n❌ INTEGRATION TEST FAILED:', error.message);
  }
};

runTests();
