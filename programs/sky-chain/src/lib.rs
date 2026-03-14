use anchor_lang::prelude::*;

declare_id!("Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd");

#[program]
pub mod sky_chain {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
