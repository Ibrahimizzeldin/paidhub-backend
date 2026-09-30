const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const REWARD = 0.0006;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = req.query.userid || req.query.user_id || req.query.userId;
  const rewardParam = req.query.reward;
  const hash = req.query.hash;

  if (!userId) return res.status(400).send('Missing userid');

  const telegramId = parseInt(userId);
  const { data: user } = await supabase.from('profiles').select('*').eq('telegram_id', telegramId).single();
  if (!user) return res.status(404).send('User not found');

  const today = new Date().toISOString().split('T')[0];
  const lastReset = user.last_reset_date || '1970-01-01';
  let dailyCount = user.daily_views_count || 0;
  if (lastReset !== today) dailyCount = 0;
  if (dailyCount >= 50) return res.status(429).send('Daily limit reached');

  const rewardAmount = rewardParam ? parseFloat(rewardParam) : REWARD;
  const newBalance = parseFloat(user.balance || 0) + rewardAmount;
  const newTotal = parseFloat(user.total_earned || 0) + rewardAmount;

  await supabase.from('profiles').update({
    balance: newBalance,
    total_earned: newTotal,
    daily_views_count: dailyCount + 1,
    weekly_views_count: (user.weekly_views_count || 0) + 1,
    total_views_count: (user.total_views_count || 0) + 1,
    last_reset_date: today
  }).eq('id', user.id);

  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: rewardAmount,
    type: 'ad_reward',
    metadata: { network: 'Adsgram', hash: hash || '' }
  });

  await supabase.from('ad_views').insert({
    user_id: user.id,
    network: 'Adsgram',
    reward: rewardAmount
  });

  res.status(200).send('OK');
};
