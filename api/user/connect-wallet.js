const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { user_id, wallet_address } = req.body;
  if (!user_id || !wallet_address) return res.status(400).json({ ok: false, error: 'Missing parameters' });

  const { data: existing } = await supabase.from('profiles').select('id, telegram_id').eq('ton_wallet', wallet_address).single();
  if (existing && existing.telegram_id !== user_id) {
    return res.status(400).json({ ok: false, error: 'WALLET_TAKEN' });
  }

  await supabase.from('profiles').update({ ton_wallet: wallet_address }).eq('telegram_id', user_id);
  res.status(200).json({ ok: true });
};
