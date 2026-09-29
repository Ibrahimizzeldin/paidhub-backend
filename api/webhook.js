const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

const bot = new Telegraf(process.env.BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CHANNEL_URL = 'https://t.me/PaidHubEarn';
const SUPPORT_URL = 'https://t.me/PaidHubSupport_Bot';

bot.start(async (ctx) => {
  const telegramId = ctx.from.id;
  const username = ctx.from.username || '';
  const firstName = ctx.from.first_name || '';
  const payload = ctx.startPayload;

  let { data: user } = await supabase.from('profiles').select('*').eq('telegram_id', telegramId).single();

  if (!user) {
    const referralCode = 'ref_' + Math.random().toString(36).substring(2, 10);
    let referredBy = null;
    let referrerData = null;

    if (payload && payload.startsWith('ref_')) {
      const refCode = payload;
      const { data: referrer } = await supabase.from('profiles').select('*').eq('referral_code', refCode).single();
      if (referrer) {
        referredBy = referrer.id;
        referrerData = referrer;
      }
    }

    const { data: newUser } = await supabase.from('profiles').insert({
      telegram_id: telegramId,
      username: username,
      first_name: firstName,
      referral_code: referralCode,
      referred_by: referredBy
    }).select().single();

    if (referrerData && newUser) {
      const bonus = 0.01;
      const newBalance = parseFloat(referrerData.balance || 0) + bonus;
      const newTotal = parseFloat(referrerData.total_earned || 0) + bonus;
      await supabase.from('profiles').update({
        balance: newBalance,
        total_earned: newTotal,
        referrals_l1_count: (referrerData.referrals_l1_count || 0) + 1
      }).eq('id', referrerData.id);

      await supabase.from('transactions').insert({
        user_id: referrerData.id,
        amount: bonus,
        type: 'referral_signup',
        metadata: { from_user: telegramId }
      });

      try {
        await bot.telegram.sendMessage(referrerData.telegram_id, '🎉 انضم صديق جديد عبر رابطك!\n💎 +0.01 USDT أُضيفت لرصيدك.');
      } catch(e) {}
    }
  }

  const webAppUrl = process.env.WEBAPP_URL || 'https://paidhub-frontend.vercel.app';
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.webApp('🚀 فتح التطبيق | Open App', webAppUrl)],
    [Markup.button.url('📢 القناة الرسمية', CHANNEL_URL), Markup.button.url('💬 الدعم الفني', SUPPORT_URL)]
  ]);

  ctx.reply(`مرحباً بك في PaidHubEarn!\n\nاربح المال عن طريق مشاهدة الإعلانات وإكمال المهام.`, keyboard);
});

bot.command('channel', (ctx) => {
  ctx.reply('📢 قناتنا الرسمية:\n' + CHANNEL_URL);
});

bot.command('support', (ctx) => {
  ctx.reply('💬 الدعم الفني:\n' + SUPPORT_URL);
});

module.exports = async (req, res) => {
  if (req.method === 'POST') return bot.handleUpdate(req.body, res);
  res.status(200).send('Bot is running');
};
