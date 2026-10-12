const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || (req.body && req.body.action);
  const userId = req.query.user_id || (req.body && req.body.user_id);

  if (!userId) return res.status(400).json({ ok: false, error: 'Missing user_id' });

  // ربط المحفظة
  if (action === 'connect') {
    const { wallet_address } = req.body;
    if (!wallet_address) return res.status(400).json({ ok: false, error: 'Missing wallet_address' });

    const { data: existing } = await supabase.from('profiles').select('id, telegram_id').eq('ton_wallet', wallet_address).single();
    if (existing && existing.telegram_id !== userId) {
      return res.status(400).json({ ok: false, error: 'WALLET_TAKEN' });
    }
    await supabase.from('profiles').update({ ton_wallet: wallet_address }).eq('telegram_id', userId);
    return res.status(200).json({ ok: true });
  }

  // فصل المحفظة
  if (action === 'disconnect') {
    await supabase.from('profiles').update({ ton_wallet: null }).eq('telegram_id', userId);
    return res.status(200).json({ ok: true });
  }

  // جلب بيانات المستخدم (الوظيفة الأصلية)
  if (req.method === 'GET') {
    const { data: user, error } = await supabase.from('profiles').select('*').eq('telegram_id', userId).single();
    if (error || !user) return res.status(404).json({ ok: false, error: 'User not found' });
    return res.status(200).json({ ok: true, user });
  }

  return res.status(400).json({ ok: false, error: 'Invalid action' });
};
