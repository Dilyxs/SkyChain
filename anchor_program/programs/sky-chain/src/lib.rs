use anchor_lang::prelude::*;

declare_id!("Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd");
const ANCHOR_DISCRIMINATOR_SIZE: usize = 8;

#[program]
pub mod sky_chain {
    use super::*;
    pub fn create_no_fly_zone(
        ctx: Context<CreateNoFlyZone>,
        polygon_id: String,
        zone_id: u64,
        polygon: Vec<ZonePoints>,
    ) -> Result<()> {
        let no_fly_zone = &mut ctx.accounts.no_fly_zone;
        no_fly_zone.zone_id = zone_id;
        no_fly_zone.owner = ctx.accounts.authority.key();
        no_fly_zone.polygon = polygon;
        no_fly_zone.polygon_id = polygon_id;
        Ok(())
    }
    pub fn set_authority(ctx: Context<SetAuthority>, new_authority: Pubkey) -> Result<()> {
        if new_authority
            != "2CSS48g6L2xLm7hrcEhFi6B2VjNUgkmMGyxBsQD53HZn" // this is the authority ID hardedcoded in for now!
                .parse::<Pubkey>()
                .unwrap()
        {
            return Err(SkyChainErrorCode::InstructionMissing.into());
        }
        let authority = &mut ctx.accounts.authority;
        authority.authority = new_authority;
        Ok(())
    }
    pub fn delete_no_fly_zone(_ctx: Context<DeleteFlyZone>, _polygon_id: String) -> Result<()> {
        Ok(())
    }
    pub fn create_drone_log(
        ctx: Context<CreateDroneLog>,
        drone_serial: String,
        time: u64,
        lat: f64,
        long: f64,
    ) -> Result<()> {
        let drone_log = &mut ctx.accounts.drone_log;
        drone_log.drone_serial = drone_serial;
        drone_log.time = time;
        drone_log.lat = lat;
        drone_log.long = long;
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
    constraint = owner.key() == "2CSS48g6L2xLm7hrcEhFi6B2VjNUgkmMGyxBsQD53HZn"
        .parse::<Pubkey>()
        .unwrap() @ SkyChainErrorCode::Unauthorized
    )]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(polygon_id:String)]
pub struct CreateNoFlyZone<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = ANCHOR_DISCRIMINATOR_SIZE + NoFlyZone::INIT_SPACE,
        seeds = [&b"no_fly_zone"[..], &polygon_id.as_bytes()],
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

#[derive(Accounts)]
#[instruction(polygon_id:String)]
pub struct DeleteFlyZone<'info> {
    #[account(
        mut,
        seeds = [&b"no_fly_zone"[..], &polygon_id.as_bytes()],
        bump,
        close=owner,
        has_one=owner
    )]
    pub no_fly_zone: Account<'info, NoFlyZone>,
    pub owner: Signer<'info>,
}
#[account]
#[derive(InitSpace)]
pub struct NoFlyZone {
    pub zone_id: u64,
    #[max_len(100)]
    pub polygon_id: String,
    pub owner: Pubkey,
    #[max_len(10)]
    pub polygon: Vec<ZonePoints>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct ZonePoints {
    pub lat: f64,
    pub lng: f64,
}

#[account]
#[derive(InitSpace)]
pub struct Authority {
    pub authority: Pubkey,
}
#[derive(Accounts)]
#[instruction(drone_serial:String)]
pub struct CreateDroneLog<'info> {
    #[account(
        init_if_needed,
        space = ANCHOR_DISCRIMINATOR_SIZE + DroneLogs::INIT_SPACE,
        payer=owner,
        seeds=[b"drone_log", drone_serial.as_bytes(), owner.key().as_ref()],
          bump,
  )]
    pub drone_log: Account<'info, DroneLogs>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[account]
#[derive(InitSpace)]
pub struct DroneLogs {
    #[max_len(40)]
    pub drone_serial: String,
    pub time: u64, //UNIX TIMESTAMP!
    pub lat: f64,
    pub long: f64,
}

#[error_code]
pub enum SkyChainErrorCode {
    #[msg("Unauthorized: Only the authority can perform this action.")]
    Unauthorized,
    #[msg("Instruction missing: The new authority must be the predefined authority.")]
    InstructionMissing,
}
