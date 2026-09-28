const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const telegramId = req.query.telegram_id;
  if (!telegramId) return res.status(400).json({ error: 'Missing telegram_id' });

  const { data: user, error } = await supabase.from('profiles').select('*').eq('telegram_id', telegramId).single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(user);
};
