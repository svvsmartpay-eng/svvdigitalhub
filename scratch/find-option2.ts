import fs from 'fs';
import readline from 'readline';

async function searchTranscript() {
  const fileStream = fs.createReadStream('C:\\Users\\vishn\\.gemini\\antigravity\\brain\\aac8f59e-ad00-4027-9e64-268d391ac138\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (line.toLowerCase().includes('option 2') || line.toLowerCase().includes('option-2') || line.toLowerCase().includes('webhook') || line.toLowerCase().includes('meta cloud')) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'USER_INPUT' || parsed.type === 'PLANNER_RESPONSE') {
          console.log(`--- Line ${lineNum} [${parsed.type}] ---`);
          const text = parsed.content || JSON.stringify(parsed.thinking || '').substring(0, 300);
          console.log(text.substring(0, 500));
        }
      } catch {}
    }
  }
}

searchTranscript();
