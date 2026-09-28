const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { user_id, channel, link, name } = req.query;
  if (!user_id || !channel) return res.status(400).send('Missing parameters');

  const telegramId = parseInt(user_id);
  const { data: user, error } = await supabase.from('profiles').select('*').eq('telegram_id', telegramId).single();
  if (error || !user) return res.status(404).send('User not found');

  const { data: existing } = await supabase.from('ambassadors').select('*').eq('user_id', user.id).eq('status', 'pending').single();
  if (existing) return res.status(429).json({ ok: false, error: 'ALREADY_PENDING' });

  await supabase.from('ambassadors').insert({
    user_id: user.id,
    channel_username: channel,
    channel_link: link || ('https://t.me/' + channel),
    status: 'pending'
  });

  res.status(200).json({ ok: true });
};
