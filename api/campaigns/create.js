const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { user_id, target_type, target_link, title, description, clicks } = req.query;
  if (!user_id || !target_link || !clicks) return res.status(400).send('Missing parameters');

  const CPC = 0.003;
  const totalClicks = parseInt(clicks);
  if (isNaN(totalClicks) || totalClicks < 100) return res.status(400).json({ ok: false, error: 'MIN_100_CLICKS' });

  const cost = totalClicks * CPC;
  const telegramId = parseInt(user_id);

  const { data: user } = await supabase.from('profiles').select('*').eq('telegram_id', telegramId).single();
  if (!user) return res.status(404).send('User not found');

  // توليد مبلغ فريد
  const { data: pending } = await supabase.from('campaigns').select('payment_amount').eq('status', 'pending_payment').order('payment_amount', { ascending: false }).limit(1);
  let uniqueAmount = cost + 0.0001;
  if (pending && pending.length > 0 && pending[0].payment_amount) {
    uniqueAmount = parseFloat(pending[0].payment_amount) + 0.0001;
  }
  uniqueAmount = Math.round(uniqueAmount * 1000000) / 1000000;

  const { data: campaign, error } = await supabase.from('campaigns').insert({
    user_id: user.id,
    target_type: target_type || 'channel',
    target_link: target_link,
    title: title || 'حملة ترويجية',
    description: description || '',
    clicks_total: totalClicks,
    clicks_done: 0,
    cost: cost,
    cpc: CPC,
    payment_amount: uniqueAmount,
    status: 'pending_payment'
  }).select().single();

  if (error) return res.status(500).json({ ok: false, error: error.message });

  res.status(200).json({ ok: true, cost: cost, payment_amount: uniqueAmount, campaign_id: campaign.id });
};
