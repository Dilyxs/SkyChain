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
        no_fly_zone.authority = ctx.accounts.owner.key();
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(zone_id:u64)]
pub struct CreateNoFlyZone<'info> {
    #[account(
        init_if_needed,
        payer = owner,
        space = ANCHOR_DISCRIMINATOR_SIZE + NoFlyZone::INIT_SPACE,
        seeds = [&b"no_fly_zone"[..], &zone_id.to_le_bytes()[..]],
        bump
    )]
    pub no_fly_zone: Account<'info, NoFlyZone>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[account]
#[derive(InitSpace)]
pub struct NoFlyZone {
    pub zone_id: u64,
    pub lat: f64,
    pub lng: f64,
    pub radius_meters: u32,
    pub authority: Pubkey,
}
