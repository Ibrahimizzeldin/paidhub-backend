const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

const bot = new Telegraf(process.env.BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

bot.start(async (ctx) => {
  const telegramId = ctx.from.id;
  const username = ctx.from.username || '';
  const firstName = ctx.from.first_name || '';
  const payload = ctx.startPayload;

  let { data: user } = await supabase.from('profiles').select('*').eq('telegram_id', telegramId).single();

  if (!user) {
    const referralCode = 'ref_' + Math.random().toString(36).substring(2, 8);
    let referredBy = null;
    if (payload && payload.startsWith('ref_')) {
       const refCode = payload.replace('ref_', '');
       const { data: referrer } = await supabase.from('profiles').select('id').eq('referral_code', refCode).single();
       if (referrer) referredBy = referrer.id;
    }
    await supabase.from('profiles').insert({
      telegram_id: telegramId,
      username: username,
      first_name: firstName,
      referral_code: referralCode,
      referred_by: referredBy
    });
  }

  const webAppUrl = process.env.WEBAPP_URL || 'https://paidhub.vercel.app';
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.webApp('🚀 فتح التطبيق | Open App', webAppUrl)]
  ]);
  ctx.reply(`مرحباً بك في PaidHubEarn!\n\nاربح المال عن طريق مشاهدة الإعلانات وإكمال المهام.`, keyboard);
});

module.exports = async (req, res) => {
  if (req.method === 'POST') return bot.handleUpdate(req.body, res);
  res.status(200).send('Bot is running');
};
