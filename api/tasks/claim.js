const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { user_id, task } = req.query;
  if (!user_id || !task) return res.status(400).send('Missing parameters');

  const telegramId = parseInt(user_id);
  const { data: user, error } = await supabase.from('profiles').select('*').eq('telegram_id', telegramId).single();
  if (error || !user) return res.status(404).send('User not found');

  const today = new Date().toISOString().split('T')[0];
  let reward = 0;
  let updateData = {};

  if (task === 'daily_login') {
    reward = 0.0001;
    if (user.last_login_reward && new Date(user.last_login_reward).toISOString().split('T')[0] === today) {
      return res.status(429).json({ ok: false, error: 'ALREADY_CLAIMED' });
    }
    updateData.last_login_reward = new Date().toISOString();
  } else if (task === 'watch_5') {
    reward = 0.0005;
    if ((user.daily_views_count || 0) < 5) return res.status(400).json({ ok: false, error: 'NOT_COMPLETED' });
    if (user.last_watch_reward && new Date(user.last_watch_reward).toISOString().split('T')[0] === today) {
      return res.status(429).json({ ok: false, error: 'ALREADY_CLAIMED' });
    }
    updateData.last_watch_reward = new Date().toISOString();
  } else {
    return res.status(400).send('Unknown task');
  }

  updateData.balance = parseFloat(user.balance || 0) + reward;
  updateData.total_earned = parseFloat(user.total_earned || 0) + reward;

  await supabase.from('profiles').update(updateData).eq('id', user.id);

  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: reward,
    type: 'task_reward',
    metadata: { task: task }
  });

  res.status(200).json({ ok: true, new_balance: updateData.balance });
};
