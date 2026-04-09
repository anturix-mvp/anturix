use anchor_lang::prelude::*;

declare_id!("6nwrr5Yj4KuevxokvBmtLKvLetJgcVTrgLnprVmw4h4x");

#[program]
pub mod anturix {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Anturix initialized");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
