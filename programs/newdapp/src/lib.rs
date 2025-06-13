use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("J47PG3y5XHQm36EhDZpMY7rpkSfJMBEYxYKkk5T8CqfL");

#[program]
pub mod newdapp {
    use super::*;

    pub fn initialize(
        ctx: Context<InitializeDao>,
        dao_name: String,
        total_supply: u64,
    ) -> Result<()> {
        require!(dao_name.len() <= 100, CustomError::StringTooLong);

        let dao_key = ctx.accounts.dao.key();
        let dao = &mut ctx.accounts.dao;
        dao.authority = *ctx.accounts.authority.key;
        dao.dao_name = dao_name.as_bytes().to_vec();
        dao.token_mint = ctx.accounts.token_mint.key();
        dao.total_supply = total_supply;
        dao.proposal_count = 0;
        dao.bump = *ctx.bumps.get("dao").unwrap();

        let mint_bump = *ctx.bumps.get("token_mint_authority").unwrap();
        let seeds: &[&[u8]] = &[b"mint_auth", dao_key.as_ref(), &[mint_bump]];
        let signer_seeds: &[&[&[u8]]] = &[seeds];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.token_mint_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        token::mint_to(cpi_ctx, total_supply)?;

        Ok(())
    }

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
        amount: u64,
        recipient: Pubkey,
    ) -> Result<()> {
        require!(title.len() <= 100 && description.len() <= 500, CustomError::StringTooLong);

        let dao = &mut ctx.accounts.dao;
        let proposal = &mut ctx.accounts.proposal;

        proposal.dao = dao.key();
        proposal.proposal_id = dao.proposal_count + 1;
        proposal.title = title.as_bytes().to_vec();
        proposal.description = description.as_bytes().to_vec();
        proposal.amount = amount;
        proposal.recipient = recipient;
        proposal.creator = ctx.accounts.authority.key();
        proposal.votes_for = 0;
        proposal.votes_against = 0;
        proposal.executed = false;
        proposal.bump = *ctx.bumps.get("proposal").unwrap();

        dao.proposal_count += 1;

        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, approve: bool, voter_weight: u64) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        require!(!proposal.executed, CustomError::ProposalAlreadyExecuted);

        if approve {
            proposal.votes_for = proposal.votes_for.checked_add(voter_weight).unwrap();
        } else {
            proposal.votes_against = proposal.votes_against.checked_add(voter_weight).unwrap();
        }
        Ok(())
    }

    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        require!(!proposal.executed, CustomError::ProposalAlreadyExecuted);
        require!(
            proposal.votes_for > proposal.votes_against,
            CustomError::ProposalNotApproved
        );

        let dao_key = ctx.accounts.dao.key();
        let dao_bump = ctx.accounts.dao.bump;
        let seeds: &[&[u8]] = &[b"dao_authority", dao_key.as_ref(), &[dao_bump]];
        let signer_seeds: &[&[&[u8]]] = &[seeds];

        let cpi_accounts = Transfer {
            from: ctx.accounts.treasury_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.dao_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        token::transfer(cpi_ctx, proposal.amount)?;

        proposal.executed = true;
        Ok(())
    }

    pub fn delete_dao(ctx: Context<DeleteDao>) -> Result<()> {
        let dao = &ctx.accounts.dao;
        require_keys_eq!(
            dao.authority,
            ctx.accounts.authority.key(),
            CustomError::Unauthorized
        );
        Ok(())
    }
}

#[account]
pub struct Dao {
    pub authority: Pubkey,
    pub dao_name: Vec<u8>,
    pub token_mint: Pubkey,
    pub total_supply: u64,
    pub proposal_count: u64,
    pub bump: u8,
}

#[account]
pub struct Proposal {
    pub dao: Pubkey,
    pub proposal_id: u64,
    pub title: Vec<u8>,
    pub description: Vec<u8>,
    pub amount: u64,
    pub recipient: Pubkey,
    pub creator: Pubkey,
    pub votes_for: u64,
    pub votes_against: u64,
    pub executed: bool,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(dao_name: String, total_supply: u64)]
pub struct InitializeDao<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 4 + 100 + 32 + 8 + 8 + 1,
        seeds = [b"dao", authority.key().as_ref()],
        bump
    )]
    pub dao: Account<'info, Dao>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = token_mint_authority,
        seeds = [b"token_mint", dao.key().as_ref()],
        bump
    )]
    pub token_mint: Account<'info, Mint>,

    /// CHECK:
    #[account(
        seeds = [b"mint_auth", dao.key().as_ref()],
        bump
    )]
    pub token_mint_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = token_mint,
        associated_token::authority = dao
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(title: String, description: String, amount: u64, recipient: Pubkey)]
pub struct CreateProposal<'info> {
    #[account(mut, has_one = authority)]
    pub dao: Account<'info, Dao>,

    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 4 + 100 + 4 + 500 + 8 + 32 + 8 + 8 + 1 + 1,
        seeds = [b"proposal", dao.key().as_ref(), &(dao.proposal_count + 1).to_le_bytes()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    pub voter: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub dao: Account<'info, Dao>,
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA DAO authority
    #[account(
        seeds = [b"dao_authority", dao.key().as_ref()],
        bump = dao.bump
    )]
    pub dao_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DeleteDao<'info> {
    #[account(
        mut,
        close = authority,
        seeds = [b"dao", authority.key().as_ref()],
        bump = dao.bump,
        has_one = authority
    )]
    pub dao: Account<'info, Dao>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[error_code]
pub enum CustomError {
    #[msg("Proposal already executed")]
    ProposalAlreadyExecuted,
    #[msg("Proposal not approved")]
    ProposalNotApproved,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("String too long")]
    StringTooLong,
}

