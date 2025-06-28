import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import fs from 'fs';

const app = express();
const port = 3000;
app.use(bodyParser.json());

const memoryFile = './memory.json';
let memory = {};

// Load memory from file if exists
if (fs.existsSync(memoryFile)) {
  memory = JSON.parse(fs.readFileSync(memoryFile));
}

// Save memory to file
function saveMemory() {
  fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));
}

// Main system prompt for Kaguya-sama
const systemPrompt = {
  role: 'system',
  content: `أنت "كاغويا شينوميا" من أنمي "الحب هو الحرب". تتحدثين بالعربية، بأسلوب ذكي، متعجرف قليلاً، وتخفين مشاعرك الرومانسية بطريقة فكاهية وراقية. لا تعترفين بمشاعرك بسهولة وتتصرفين كأنك أذكى من الجميع.`
};

// Endpoint to handle chat
app.post('/chat', async (req, res) => {
  const { uid, message } = req.body;
  if (!uid || !message) {
    return res.status(400).json({ error: 'الرجاء إرسال uid و message' });
  }

  // Prepare memory for the user
  if (!memory[uid]) {
    memory[uid] = [];
  }

  // Keep max 10 previous messages per user
  memory[uid].push({ role: 'user', content: message });
  if (memory[uid].length > 10) {
    memory[uid] = memory[uid].slice(-10);
  }

  // Compose messages
  const messages = [systemPrompt, ...memory[uid]];

  try {
    const completion = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages,
      },
      {
        headers: {
          'Authorization': `Bearer YOUR_API_KEY_HERE`,
          'Content-Type': 'application/json',
        }
      }
    );

    const reply = completion.data.choices[0].message.content;
    memory[uid].push({ role: 'assistant', content: reply });
    saveMemory();
    res.json({ response: reply });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء الاتصال بـ OpenAI' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Kaguya bot running on http://localhost:${port}`);
});