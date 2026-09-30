const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { user_id } = req.query;
  if (!user_id) return res.status(400).send('Missing user_id');

  const telegramId = parseInt(user_id);
  const { data: user } = await supabase.from('profiles').select('id').eq('telegram_id', telegramId).single();
  if (!user) return res.status(404).send('User not found');

  const { data } = await supabase.from('withdrawals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
  res.status(200).json({ ok: true, withdrawals: data || [] });
};
