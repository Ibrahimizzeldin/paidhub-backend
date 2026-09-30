const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const MIN_WITHDRAWAL = 1.0;
const FEE = 0.05;

async function sendTelegramMessage(chatId, text) {
  try {
    const res = await fetch('https://api.telegram.org/bot' + process.env.BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text })
    });
    return await res.json();
  } catch(e) { return { ok: false }; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { user_id, amount, wallet } = req.query;
  if (!user_id || !amount || !wallet) return res.status(400).send('Missing parameters');

  const telegramId = parseInt(user_id);
  const amountNum = parseFloat(amount);

  if (!wallet.startsWith('UQ') && !wallet.startsWith('EQ')) return res.status(400).json({ ok: false, error: 'INVALID_WALLET' });
  if (amountNum < MIN_WITHDRAWAL) return res.status(400).json({ ok: false, error: 'MIN_1_USDT' });

  const { data: user } = await supabase.from('profiles').select('*').eq('telegram_id', telegramId).single();
  if (!user) return res.status(404).send('User not found');
  if (parseFloat(user.balance || 0) < amountNum) return res.status(400).json({ ok: false, error: 'INSUFFICIENT_BALANCE' });

  const netAmount = amountNum - FEE;
  const newBalance = parseFloat(user.balance || 0) - amountNum;
  await supabase.from('profiles').update({ balance: newBalance }).eq('id', user.id);

  const { data: withdrawal } = await supabase.from('withdrawals').insert({
    user_id: user.id, amount: amountNum, fee: FEE, net_amount: netAmount,
    wallet_address: wallet, status: 'pending'
  }).select().single();

  await supabase.from('transactions').insert({
    user_id: user.id, amount: -amountNum, type: 'withdrawal', status: 'pending',
    metadata: { withdrawal_id: withdrawal.id, wallet: wallet }
  });

  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (adminId) {
    const msg = 'طلب سحب جديد\n\nالمستخدم: ' + (user.first_name || 'User') + '\nID: ' + user.telegram_id + '\nالمبلغ: ' + amountNum.toFixed(4) + ' USDT\nالصافي: ' + netAmount.toFixed(4) + ' USDT\nالعنوان: ' + wallet + '\nرقم الطلب: ' + withdrawal.id;
    await sendTelegramMessage(adminId, msg);
  }

  res.status(200).json({ ok: true, withdrawal_id: withdrawal.id, net: netAmount });
};
