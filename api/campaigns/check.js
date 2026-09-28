const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const PROJECT_WALLET = 'UQALZMicg23BUZMS0VgEMC713rfMMdsmyyf3AWU999Jh9unf';
const USDT_JETTON = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { campaign_id } = req.query;

  try {
    const { data: pendingCampaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'pending_payment');

    if (!pendingCampaigns || pendingCampaigns.length === 0) {
      return res.status(200).json({ ok: true, matched: 0 });
    }

    const r = await fetch('https://tonapi.io/v2/accounts/' + PROJECT_WALLET + '/events?limit=50');
    if (!r.ok) return res.status(200).json({ ok: false, error: 'tonapi failed', status: r.status });
    const events = await r.json();
    if (!events || !events.events) return res.status(200).json({ ok: true, matched: 0 });

    let matched = 0;
    let matchedCampaign = null;

    for (const ev of events.events) {
      for (const action of ev.actions || []) {
        if (action.type !== 'JettonTransfer') continue;
        const jt = action.JettonTransfer;
        if (!jt) continue;
        if (jt.jetton && jt.jetton.address && jt.jetton.address !== USDT_JETTON) continue;
        if (jt.recipient && jt.recipient.address && jt.recipient.address !== PROJECT_WALLET) continue;

        const amount = parseFloat(jt.amount || 0) / 1000000;
        for (const camp of pendingCampaigns) {
          if (!camp.payment_amount) continue;
          if (Math.abs(parseFloat(camp.payment_amount) - amount) < 0.0000001) {
            await supabase.from('campaigns').update({
              status: 'active',
              tx_hash: ev.event_id
            }).eq('id', camp.id);
            matched++;
            if (campaign_id && camp.id === campaign_id) matchedCampaign = camp.id;
            break;
          }
        }
      }
    }

    res.status(200).json({ ok: true, matched: matched, campaign_id: matchedCampaign });
  } catch (e) {
    res.status(200).json({ ok: false, error: e.message });
  }
};
