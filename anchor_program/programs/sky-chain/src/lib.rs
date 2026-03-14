use anchor_lang::prelude::*;

declare_id!("Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd");
const ANCHOR_DISCRIMINATOR_SIZE: usize = 8;

#[program]
pub mod sky_chain {
    use super::*;
    pub fn create_no_fly_zone(
        ctx: Context<CreateNoFlyZone>,
        zone_id: u64,
        lat: f64,
        lng: f64,
        radius_meters: u32,
    ) -> Result<()> {
        let no_fly_zone = &mut ctx.accounts.no_fly_zone;
        no_fly_zone.zone_id = zone_id;
        no_fly_zone.lat = lat;
        no_fly_zone.lng = lng;
        no_fly_zone.radius_meters = radius_meters;
        no_fly_zone.owner = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn set_authority(ctx: Context<SetAuthority>, new_authority: Pubkey) -> Result<()> {
        if new_authority
            != "Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd" // this is the authority ID hardedcoded in for now!
                .parse::<Pubkey>()
                .unwrap()
        {
            return Err(SkyChainErrorCode::InstructionMissing.into());
        }
        let authority = &mut ctx.accounts.authority;
        authority.authority = new_authority;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct SetAuthority<'info> {
    #[account(
        init,
        payer=owner,
        space = ANCHOR_DISCRIMINATOR_SIZE + Authority::INIT_SPACE,
        seeds = [&b"authority"[..]],
        bump
    )]
    pub authority: Account<'info, Authority>,
    #[account(mut,
    constraint = owner.key() == "Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd"
        .parse::<Pubkey>()
        .unwrap() @ SkyChainErrorCode::Unauthorized
    )]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(zone_id:u64)]
pub struct CreateNoFlyZone<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = ANCHOR_DISCRIMINATOR_SIZE + NoFlyZone::INIT_SPACE,
        seeds = [&b"no_fly_zone"[..], &zone_id.to_le_bytes()[..]],
        bump,
    )]
    pub no_fly_zone: Account<'info, NoFlyZone>,
    #[account(
    seeds = [b"authority"],
    bump,
    has_one = authority @ SkyChainErrorCode::Unauthorized
)]
    pub authority_config: Account<'info, Authority>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[account]
#[derive(InitSpace)]
pub struct NoFlyZone {
    pub zone_id: u64,
    pub lat: f64,
    pub lng: f64,
    pub radius_meters: u32,
    pub owner: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct Authority {
    pub authority: Pubkey,
}

#[error_code]
pub enum SkyChainErrorCode {
    #[msg("Unauthorized: Only the authority can perform this action.")]
    Unauthorized,
    #[msg("Instruction missing: The new authority must be the predefined authority.")]
    InstructionMissing,
}
