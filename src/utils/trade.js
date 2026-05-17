import { supabase, SUPABASE_ENABLED } from '../lib/supabase';

const RARITY_TIERS = ['common', 'uncommon', 'rare', 'legendary', 'secret'];
const UPGRADE_CHANCE = 0.15;

export function maybeUpgrade(rarity) {
  if (Math.random() > UPGRADE_CHANCE) return rarity;
  const idx = RARITY_TIERS.indexOf(rarity);
  if (idx < 0 || idx >= RARITY_TIERS.length - 1) return rarity;
  return RARITY_TIERS[idx + 1];
}

function snap(card) {
  return {
    id: card.id, name: card.name, type: card.type,
    rarity: card.rarity, flavor: card.flavor,
    photo: card.photo || null, stats: card.stats,
  };
}

export async function createTrade(card, deviceId) {
  if (!SUPABASE_ENABLED) return { error: 'Supabase required for trading' };
  const { data, error } = await supabase
    .from('trades')
    .insert({
      initiator_device_id: deviceId,
      initiator_card_id: card.id,
      initiator_card_snapshot: snap(card),
      status: 'pending',
    })
    .select().single();
  if (error) return { error: error.message };
  const url = `${window.location.origin}${window.location.pathname}#trade=${data.id}`;
  return { trade: data, url };
}

export async function fetchTrade(tradeId) {
  if (!SUPABASE_ENABLED) return null;
  const { data, error } = await supabase
    .from('trades').select('*').eq('id', tradeId).single();
  return error ? null : data;
}

export async function acceptTrade(trade, recipientCard, recipientDeviceId) {
  const initSnap = trade.initiator_card_snapshot;
  const initNewRarity = maybeUpgrade(initSnap.rarity);
  const recpNewRarity = maybeUpgrade(recipientCard.rarity);

  // Mark completed — .eq('status','pending') guards against double-accept
  const { error } = await supabase.from('trades').update({
    recipient_device_id: recipientDeviceId,
    recipient_card_id: recipientCard.id,
    recipient_card_snapshot: snap(recipientCard),
    status: 'completed',
  }).eq('id', trade.id).eq('status', 'pending');
  if (error) return { error: error.message };

  // Delete both original cards
  await supabase.from('cards').delete().eq('id', trade.initiator_card_id);
  await supabase.from('cards').delete().eq('id', recipientCard.id);

  // Give initiator recipient's card (possibly upgraded)
  await supabase.from('cards').insert({
    device_id: trade.initiator_device_id,
    name: recipientCard.name, type: recipientCard.type,
    rarity: recpNewRarity, flavor: recipientCard.flavor || '',
    photo_url: recipientCard.photo || null, stats: recipientCard.stats || [],
  });

  // Give recipient initiator's card (possibly upgraded)
  const { data: newCard } = await supabase.from('cards').insert({
    device_id: recipientDeviceId,
    name: initSnap.name, type: initSnap.type,
    rarity: initNewRarity, flavor: initSnap.flavor || '',
    photo_url: initSnap.photo || null, stats: initSnap.stats || [],
  }).select().single();

  return {
    newCard: { ...initSnap, id: newCard?.id, rarity: initNewRarity },
    upgraded: initNewRarity !== initSnap.rarity,
    originalRarity: initSnap.rarity,
    newRarity: initNewRarity,
  };
}

export async function cancelTrade(tradeId) {
  await supabase.from('trades')
    .update({ status: 'cancelled' })
    .eq('id', tradeId).eq('status', 'pending');
}

export function subscribeTrade(tradeId, onChange) {
  return supabase
    .channel(`trade-${tradeId}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'trades',
      filter: `id=eq.${tradeId}`,
    }, payload => onChange(payload.new))
    .subscribe();
}
