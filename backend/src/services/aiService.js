// Fetch is natively available as a global in Node 20+

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const generateHealthSummary = async (patient, biomarkers, labResults, notes) => {
  const apiKey = process.env.GROQ_API_KEY;

  // 1. Prepare clinical context
  const age = Math.floor((new Date() - new Date(patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
  
  // Group results by biomarker name
  const biomarkerMap = {};
  biomarkers.forEach(b => {
    biomarkerMap[b._id.toString()] = {
      name: b.name,
      unit: b.unit,
      min: b.referenceMin,
      max: b.referenceMax,
      history: []
    };
  });

  labResults.forEach(r => {
    const bId = r.biomarkerId.toString();
    if (biomarkerMap[bId]) {
      biomarkerMap[bId].history.push({
        value: r.value,
        date: new Date(r.measuredAt).toISOString().split('T')[0]
      });
    }
  });

  // Sort histories chronologically
  Object.values(biomarkerMap).forEach(b => {
    b.history.sort((a, b) => new Date(a.date) - new Date(b.date));
  });

  const notesText = notes.map(n => `- [${new Date(n.createdAt).toISOString().split('T')[0]}]: ${n.note}`).join('\n');

  let patientDataStr = `Patient: ${patient.name}, Age: ${age}\n\nBiomarkers History:\n`;
  Object.values(biomarkerMap).forEach(b => {
    patientDataStr += `- ${b.name} (Ref: ${b.min}-${b.max} ${b.unit}):\n`;
    if (b.history.length === 0) {
      patientDataStr += `  No data available\n`;
    } else {
      b.history.forEach(h => {
        patientDataStr += `  * ${h.date}: ${h.value} ${b.unit}\n`;
      });
    }
  });

  patientDataStr += `\nClinical Notes:\n${notesText || 'No clinical notes recorded.'}`;

  // 2. If API key exists, call Groq
  if (apiKey) {
    try {
      const response = await globalThis.fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: `You are an AI clinical summarization assistant for HealthTrack AI.
Analyze the patient's biomarker histories and clinician notes.
Generate a summary report for the doctor.

Format your output exactly in this structure (use this layout and plain text):

Summary:
[Write a concise paragraph summarizing the patient's health progress, highlighting any key trends or changes over time.]

Observed trends:
- [Biomarker 1]: [Briefly describe trend, e.g., 'gradual increase over three measurements', 'stable within range', etc.]
- [Biomarker 2]: [Briefly describe trend...]

Items for clinician review:
- [Item 1, e.g., 'Elevated LDL levels warranting dietary discussion.']
- [Item 2...]

Keep it professional, clinical, and objective.`
            },
            {
              role: 'user',
              content: patientDataStr
            }
          ],
          temperature: 0.1
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return content;
        }
      } else {
        const errText = await response.text();
        console.error('Groq API error response:', errText);
      }
    } catch (err) {
      console.error('Error fetching summary from Groq:', err);
    }
  }

  // 3. Fallback: Rule-Based Mock Generator (if Groq fails or no API Key)
  console.log('Using local fallback summary generator...');
  
  let summary = `Patient health assessment for ${patient.name} (${age} y/o). `;
  const trendsList = [];
  const reviewItems = [];

  Object.values(biomarkerMap).forEach(b => {
    if (b.history.length >= 2) {
      const first = b.history[0].value;
      const last = b.history[b.history.length - 1].value;
      const diff = last - first;
      const change = diff > 0 ? 'increasing' : diff < 0 ? 'decreasing' : 'stable';
      
      trendsList.push(`- ${b.name}: ${change} trend (${first} to ${last} ${b.unit})`);
      
      if (last > b.max) {
        reviewItems.push(`- Elevated ${b.name} level of ${last} ${b.unit} (reference maximum: ${b.max} ${b.unit})`);
      } else if (last < b.min) {
        reviewItems.push(`- Low ${b.name} level of ${last} ${b.unit} (reference minimum: ${b.min} ${b.unit})`);
      }

      if (b.name === 'LDL' && change === 'increasing') {
        reviewItems.push(`- Rising LDL lipid levels across the last ${b.history.length} tests should be monitored.`);
      }
    } else if (b.history.length === 1) {
      const val = b.history[0].value;
      trendsList.push(`- ${b.name}: Single baseline measurement of ${val} ${b.unit}`);
      if (val > b.max || val < b.min) {
        reviewItems.push(`- Baseline ${b.name} of ${val} ${b.unit} is outside reference range.`);
      }
    } else {
      trendsList.push(`- ${b.name}: No measurements recorded`);
    }
  });

  if (reviewItems.length === 0) {
    reviewItems.push('- All tracked biomarkers are currently stable and within reference ranges.');
  }

  // Create a paragraph summary based on results
  const ldl = biomarkerMap[Object.keys(biomarkerMap).find(k => biomarkerMap[k].name === 'LDL')];
  if (ldl && ldl.history.length >= 2) {
    const ldlDiff = ldl.history[ldl.history.length - 1].value - ldl.history[0].value;
    if (ldlDiff > 0) {
      summary += `LDL lipid panels show a gradual increase over the last ${ldl.history.length} measurements. `;
    } else {
      summary += `LDL lipid panels remain stable and controlled. `;
    }
  }
  
  const vitD = biomarkerMap[Object.keys(biomarkerMap).find(k => biomarkerMap[k].name === 'Vitamin D')];
  if (vitD && vitD.history.length >= 2) {
    const vitDLast = vitD.history[vitD.history.length - 1].value;
    if (vitDLast < vitD.min) {
      summary += `Vitamin D insufficiency remains present (${vitDLast} ${vitD.unit}). Dietary adjustments or supplementation may be indicated. `;
    } else {
      summary += `Vitamin D levels have stabilized within the normal reference range. `;
    }
  }

  if (notes.length > 0) {
    summary += `Recent clinical discussions indicate the patient is responsive to treatment advice.`;
  } else {
    summary += `No clinical sessions or notes have been added recently.`;
  }

  return `Summary:
${summary}

Observed trends:
${trendsList.join('\n')}

Items for clinician review:
${reviewItems.join('\n')}`;
};
