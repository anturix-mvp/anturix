use anchor_lang::prelude::*;
use crate::state::UserProfile;
use crate::constants::SEED_PROFILE;

pub fn handler(ctx: Context<InitProfile>) -> Result<()> {
    let profile = &mut ctx.accounts.user_profile;
    profile.owner = ctx.accounts.owner.key();
    profile.bump = ctx.bumps.user_profile;
    Ok(())
}

#[derive(Accounts)]
pub struct InitProfile<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = UserProfile::SIZE,
        seeds = [SEED_PROFILE, owner.key().as_ref()],
        bump,
    )]
    pub user_profile: Account<'info, UserProfile>,

    pub system_program: Program<'info, System>,
}
