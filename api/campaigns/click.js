const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { user_id, campaign_id } = req.query;
  if (!user_id || !campaign_id) return res.status(400).send('Missing parameters');

  const REWARD = 0.001;
  const telegramId = parseInt(user_id);

  const { data: user } = await supabase.from('profiles').select('*').eq('telegram_id', telegramId).single();
  if (!user) return res.status(404).send('User not found');

  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', campaign_id).single();
  if (!campaign || campaign.status !== 'active') return res.status(400).json({ ok: false, error: 'CAMPAIGN_INACTIVE' });
  if (campaign.clicks_done >= campaign.clicks_total) return res.status(400).json({ ok: false, error: 'CAMPAIGN_FULL' });
  if (campaign.user_id === user.id) return res.status(400).json({ ok: false, error: 'OWN_CAMPAIGN' });

  const { data: existing } = await supabase.from('campaign_clicks').select('id').eq('campaign_id', campaign_id).eq('user_id', user.id).single();
  if (existing) return res.status(400).json({ ok: false, error: 'ALREADY_CLICKED' });

  const newBalance = parseFloat(user.balance || 0) + REWARD;
  const newTotal = parseFloat(user.total_earned || 0) + REWARD;
  await supabase.from('profiles').update({ balance: newBalance, total_earned: newTotal }).eq('id', user.id);

  await supabase.from('campaign_clicks').insert({ campaign_id: campaign_id, user_id: user.id, reward: REWARD });

  const newClicksDone = (campaign.clicks_done || 0) + 1;
  const newStatus = newClicksDone >= campaign.clicks_total ? 'completed' : 'active';
  await supabase.from('campaigns').update({ clicks_done: newClicksDone, status: newStatus }).eq('id', campaign_id);

  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: REWARD,
    type: 'campaign_click',
    metadata: { campaign_id: campaign_id }
  });

  res.status(200).json({ ok: true, new_balance: newBalance });
};
