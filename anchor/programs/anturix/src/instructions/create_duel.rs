use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{UserProfile, DuelState, DuelStatus, Condition, PositionTicket};
use crate::constants::*;
use crate::errors::AnturixError;
use crate::events::DuelCreated;
use crate::pyth;

pub fn handler(
    ctx: Context<CreateDuel>,
    price_feed_id: [u8; 32],
    target_price: i64,
    condition: Condition,
    stake_amount: u64,
    target_opponent: Option<Pubkey>,
    expires_at: i64,
    lower_bound: i64,
    upper_bound: i64,
    price_feed_id_b: [u8; 32],
    mode: crate::state::DuelMode,
    creator_side: crate::state::Side,
) -> Result<()> {
    require!(stake_amount >= MIN_STAKE, AnturixError::StakeTooLow);

    let clock = Clock::get()?;
    require!(expires_at > clock.unix_timestamp, AnturixError::InvalidExpiry);
    require!(
        expires_at >= clock.unix_timestamp.checked_add(MIN_EXPIRY_DURATION).ok_or(AnturixError::Overflow)?,
        AnturixError::InvalidExpiry
    );

    // Per-condition validation
    let mut start_price_a: i64 = 0;
    let mut start_price_b: i64 = 0;

    match condition {
        Condition::Above | Condition::Below => {
            require!(target_price > 0, AnturixError::InvalidTargetPrice);
        }
        Condition::Odd | Condition::Even => {
            // Just needs a feed_id, no target validation
        }
        Condition::InRange | Condition::OutOfRange => {
            require!(lower_bound > 0, AnturixError::InvalidBounds);
            require!(upper_bound > lower_bound, AnturixError::InvalidBounds);
        }
        Condition::AssetRace => {
            require!(price_feed_id_b != [0u8; 32], AnturixError::InvalidSecondFeed);
            require!(price_feed_id != price_feed_id_b, AnturixError::InvalidSecondFeed);

            // Snapshot start prices from remaining_accounts
            require!(ctx.remaining_accounts.len() >= 2, AnturixError::MissingPriceAccount);

            let price_a = pyth::parse_price_update(
                &ctx.remaining_accounts[0],
                &price_feed_id,
                &clock,
            )?;
            let price_b = pyth::parse_price_update(
                &ctx.remaining_accounts[1],
                &price_feed_id_b,
                &clock,
            )?;

            start_price_a = price_a.price;
            start_price_b = price_b.price;
        }
    }

    let creator_profile = &mut ctx.accounts.creator_profile;
    let duel = &mut ctx.accounts.duel_state;

    duel.creator = ctx.accounts.creator.key();
    duel.opponent = target_opponent.unwrap_or(Pubkey::default());
    duel.price_feed_id = price_feed_id;
    duel.target_price = target_price;
    duel.condition = condition.clone();
    duel.stake_amount = stake_amount;
    duel.status = DuelStatus::Pending;
    duel.winner = None;
    duel.expires_at = expires_at;
    duel.bump = ctx.bumps.duel_state;
    duel.escrow_bump = ctx.bumps.escrow;
    duel.lower_bound = lower_bound;
    duel.upper_bound = upper_bound;
    duel.price_feed_id_b = price_feed_id_b;
    duel.start_price_a = start_price_a;
    duel.start_price_b = start_price_b;
    duel.mode = mode;
    duel.creator_side = creator_side.clone();
    duel.winning_side = creator_side.clone();
    duel.next_ticket_id = 1;

    // Initialize pool totals with the creator's stake
    match creator_side {
        crate::state::Side::Up => {
            duel.pool_up_total = stake_amount;
            duel.pool_down_total = 0;
            duel.locked_payout_up_total = stake_amount
                .checked_mul(2)
                .ok_or(AnturixError::Overflow)?;
            duel.locked_payout_down_total = 0;
        }
        crate::state::Side::Down => {
            duel.pool_up_total = 0;
            duel.pool_down_total = stake_amount;
            duel.locked_payout_up_total = 0;
            duel.locked_payout_down_total = stake_amount
                .checked_mul(2)
                .ok_or(AnturixError::Overflow)?;
        }
    }

    let creator_ticket = &mut ctx.accounts.creator_ticket;
    creator_ticket.duel = duel.key();
    creator_ticket.owner = ctx.accounts.creator.key();
    creator_ticket.side = creator_side;
    creator_ticket.amount = stake_amount;
    creator_ticket.locked_odds_bps = DEFAULT_START_ODDS_BPS;
    creator_ticket.potential_payout = stake_amount
        .checked_mul(2)
        .ok_or(AnturixError::Overflow)?;
    creator_ticket.claimed = false;
    creator_ticket.created_at = clock.unix_timestamp;
    creator_ticket.bump = ctx.bumps.creator_ticket;

    // Transfer stake to escrow
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        ),
        stake_amount,
    )?;

    creator_profile.duel_count = creator_profile.duel_count
        .checked_add(1)
        .ok_or(AnturixError::Overflow)?;

    let condition_u8 = match condition {
        Condition::Above => 0u8,
        Condition::Below => 1u8,
        Condition::Odd => 2u8,
        Condition::Even => 3u8,
        Condition::InRange => 4u8,
        Condition::OutOfRange => 5u8,
        Condition::AssetRace => 6u8,
    };

    emit!(DuelCreated {
        duel: duel.key(),
        creator: ctx.accounts.creator.key(),
        price_feed_id,
        target_price,
        condition: condition_u8,
        stake_amount,
        target_opponent,
        expires_at,
        lower_bound,
        upper_bound,
    });


    Ok(())
}

#[derive(Accounts)]
pub struct CreateDuel<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_PROFILE, creator.key().as_ref()],
        bump = creator_profile.bump,
    )]
    pub creator_profile: Account<'info, UserProfile>,

    #[account(
        init,
        payer = creator,
        space = DuelState::SIZE,
        seeds = [SEED_DUEL, creator.key().as_ref(), &creator_profile.duel_count.to_le_bytes()],
        bump,
    )]
    pub duel_state: Account<'info, DuelState>,

    #[account(
        init,
        payer = creator,
        space = PositionTicket::SIZE,
        seeds = [SEED_TICKET, duel_state.key().as_ref(), &0u64.to_le_bytes()],
        bump,
    )]
    pub creator_ticket: Account<'info, PositionTicket>,

    /// CHECK: escrow PDA — system-owned, holds stake SOL
    #[account(
        mut,
        seeds = [SEED_ESCROW, duel_state.key().as_ref()],
        bump,
    )]
    pub escrow: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}
