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

function genCode() {
  // No ambiguous chars (0/O, 1/I/L)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/* ── Create a lobby ── */
export async function createLobby(card, deviceId) {
  if (!SUPABASE_ENABLED) return { error: 'Supabase required' };
  const roomCode = genCode();
  const { data, error } = await supabase
    .from('trades')
    .insert({
      initiator_device_id: deviceId,
      initiator_card_id: card.id,
      initiator_card_snapshot: snap(card),
      room_code: roomCode,
      status: 'waiting',
      initiator_ready: false,
      recipient_ready: false,
    })
    .select().single();
  if (error) return { error: error.message };
  const url = `${window.location.origin}${window.location.pathname}#trade=${roomCode}`;
  return { trade: data, roomCode, url };
}

/* ── Join a lobby by room code ── */
export async function joinLobby(roomCode, deviceId) {
  if (!SUPABASE_ENABLED) return { error: 'Supabase required' };
  const { data: trade, error } = await supabase
    .from('trades')
    .select('*')
    .eq('room_code', roomCode.toUpperCase())
    .eq('status', 'waiting')
    .single();

  if (error || !trade) return { error: 'Room not found or already started.' };
  if (trade.initiator_device_id === deviceId) return { error: 'self' };

  const { data: joined, error: joinErr } = await supabase
    .from('trades')
    .update({ recipient_device_id: deviceId, status: 'matched' })
    .eq('id', trade.id)
    .eq('status', 'waiting')
    .select().single();

  if (joinErr || !joined) return { error: 'Could not join — trade may have been cancelled.' };
  return { trade: joined };
}

/* ── Recipient picks their card ── */
export async function setRecipientCard(tradeId, card) {
  const { error } = await supabase
    .from('trades')
    .update({ recipient_card_snapshot: snap(card), recipient_card_id: card.id })
    .eq('id', tradeId);
  return !error;
}

/* ── Mark a party as ready ── */
export async function setReady(tradeId, role) {
  const field = role === 'initiator' ? 'initiator_ready' : 'recipient_ready';
  const { data, error } = await supabase
    .from('trades')
    .update({ [field]: true })
    .eq('id', tradeId)
    .select().single();
  return error ? null : data;
}

/* ── Race to set status=completed and store final rarities ── */
export async function executeTrade(trade) {
  // initiator receives recipient's card; recipient receives initiator's card
  const initFinalRarity = maybeUpgrade(trade.recipient_card_snapshot.rarity);
  const recpFinalRarity = maybeUpgrade(trade.initiator_card_snapshot.rarity);

  const { data, error } = await supabase
    .from('trades')
    .update({
      status: 'completed',
      initiator_final_rarity: initFinalRarity,
      recipient_final_rarity: recpFinalRarity,
    })
    .eq('id', trade.id)
    .eq('status', 'matched') // guard: only one client wins
    .select().single();

  return error || !data ? null : { initFinalRarity, recpFinalRarity };
}

/* ── Each client claims their received card ── */
export async function claimCard(trade, role, deviceId, userId = null) {
  const isInit = role === 'initiator';
  const myCardId   = isInit ? trade.initiator_card_id   : trade.recipient_card_id;
  const received   = isInit ? trade.recipient_card_snapshot : trade.initiator_card_snapshot;
  const finalRarity = isInit ? trade.initiator_final_rarity : trade.recipient_final_rarity;
  const newRarity  = finalRarity || received.rarity;

  await supabase.from('cards').delete().eq('id', myCardId);

  const { data } = await supabase.from('cards').insert({
    device_id: deviceId,
    user_id: userId || undefined,
    name: received.name, type: received.type,
    rarity: newRarity, flavor: received.flavor || '',
    photo_url: received.photo || null, stats: received.stats || [],
  }).select().single();

  return {
    newCard: { ...received, id: data?.id, rarity: newRarity },
    upgraded: newRarity !== received.rarity,
    originalRarity: received.rarity,
    newRarity,
  };
}

/* ── Cancel a lobby ── */
export async function cancelLobby(tradeId) {
  await supabase.from('trades')
    .update({ status: 'cancelled' })
    .eq('id', tradeId)
    .in('status', ['waiting', 'matched']);
}

/* ── Fetch a trade by ID ── */
export async function fetchTrade(tradeId) {
  if (!SUPABASE_ENABLED) return null;
  const { data, error } = await supabase
    .from('trades').select('*').eq('id', tradeId).single();
  return error ? null : data;
}

/* ── Subscribe to real-time updates on a trade ── */
export function subscribeTrade(tradeId, onChange) {
  return supabase
    .channel(`trade-${tradeId}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'trades',
      filter: `id=eq.${tradeId}`,
    }, payload => onChange(payload.new))
    .subscribe();
}
