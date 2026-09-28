const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { user_id, reward, network } = req.query;
  if (!user_id || !reward) return res.status(400).send('Missing parameters');

  const telegramId = parseInt(user_id);
  const rewardAmount = parseFloat(reward);

  const { data: user, error } = await supabase.from('profiles').select('*').eq('telegram_id', telegramId).single();
  if (error || !user) return res.status(404).send('User not found');

  const newBalance = parseFloat(user.balance || 0) + rewardAmount;
  const newTotal = parseFloat(user.total_earned || 0) + rewardAmount;

  await supabase.from('profiles').update({
    balance: newBalance,
    total_earned: newTotal,
    daily_views_count: (user.daily_views_count || 0) + 1,
    weekly_views_count: (user.weekly_views_count || 0) + 1,
    total_views_count: (user.total_views_count || 0) + 1
  }).eq('id', user.id);

  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: rewardAmount,
    type: 'ad_reward',
    metadata: { network: network || 'Adsgram' }
  });

  await supabase.from('ad_views').insert({
    user_id: user.id,
    network: network || 'Adsgram',
    reward: rewardAmount
  });

  res.status(200).json({ ok: true, new_balance: newBalance });
};
