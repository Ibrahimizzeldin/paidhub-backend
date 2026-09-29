const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { campaign_id, user_id } = req.query;
  if (!campaign_id || !user_id) return res.status(400).send('Missing parameters');

  const telegramId = parseInt(user_id);
  const { data: user } = await supabase.from('profiles').select('id').eq('telegram_id', telegramId).single();
  if (!user) return res.status(404).send('User not found');

  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', campaign_id).single();
  if (!campaign) return res.status(404).send('Campaign not found');
  if (campaign.user_id !== user.id) return res.status(403).send('Forbidden');
  if (campaign.status !== 'pending_payment') return res.status(400).json({ ok: false, error: 'NOT_PENDING' });

  await supabase.from('campaigns').delete().eq('id', campaign_id);
  res.status(200).json({ ok: true });
};
