const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  const { user_id, reward, network } = req.query;
  if (!user_id || !reward) return res.status(400).send('Missing parameters');

  const telegramId = parseInt(user_id);
  const rewardAmount = parseFloat(reward);

  const { data: user, error } = await supabase.from('profiles').select('*').eq('telegram_id', telegramId).single();
  if (error || !user) return res.status(404).send('User not found');

  const newBalance = user.balance + rewardAmount;
  await supabase.from('profiles').update({ balance: newBalance }).eq('id', user.id);
  
  await supabase.from('transactions').insert({ user_id: user.id, amount: rewardAmount, type: 'ad_reward', metadata: { network: network || 'Adsgram' } });
  await supabase.from('ad_views').insert({ user_id: user.id, network: network || 'Adsgram', reward: rewardAmount });

  res.status(200).send('OK');
};
