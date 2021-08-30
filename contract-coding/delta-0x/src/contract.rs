use cosmwasm_bignumber::{Decimal256, Uint256};
use cosmwasm_std::{
    to_binary, Api, Binary, Env, Extern, HandleResponse, InitResponse, Querier, StdError,
    StdResult, Storage, WasmMsg, HumanAddr, Coin, CosmosMsg, BankMsg, Uint128
};

use crate::msg::{CountResponse, HandleMsg, AnchorHandleMsg, InitMsg, QueryMsg};
use crate::state::{config, config_read, State};
use moneymarket::querier::{deduct_tax, query_balance, query_supply};
// copied from: https://github.com/Anchor-Protocol/money-market-contracts/blob/main/contracts/market/src/contract.rs
use moneymarket::market::{ Cw20HookMsg, HandleMsg as AnchorMarketHandleMsg };
use cw20::{Cw20CoinHuman, Cw20ReceiveMsg, MinterResponse};

pub fn init<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    msg: InitMsg,
) -> StdResult<InitResponse> {
    // TODO: add a function to update anchor smart contract address
    // contract_addr from https://docs.anchorprotocol.com/smart-contracts/deployed-contracts
    let state = State {
        count: msg.count,
        owner: deps.api.canonical_address(&env.message.sender)?,
        anchor_contract_addr: HumanAddr("terra15dwd5mj8v59wpj0wvt233mf5efdff808c5tkal".to_string())
    };

    config(&mut deps.storage).save(&state)?;

    Ok(InitResponse::default())
}

pub fn try_deposit<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
) -> StdResult<HandleResponse> {
    let state = config_read(&deps.storage).load()?;

    let deposit_amount: Uint128 = env
        .message
        .sent_funds
        .iter()
        .find(|c| c.denom == "uusd")
        .map(|c| Uint128::from(c.amount))
        .unwrap_or_else(Uint128::zero);

    // Cannot deposit zero amount
    if deposit_amount.is_zero() {
        return Err(StdError::generic_err(format!(
            "Deposit amount must be greater than 0 {}",
            "uusd",
        )));
    }

    // https://github.com/Anchor-Protocol/money-market-contracts/blob/main/contracts/market/src/contract.rs
    let msg = AnchorHandleMsg::DepositStable{};
    let exec = WasmMsg::Execute {
        contract_addr: state.anchor_contract_addr,
        msg: to_binary(&msg)?,
        send: vec![deduct_tax(&deps, Coin {
            denom: "uusd".to_string(),
            amount: deposit_amount ,
        })?],
    };

    // Ok(vec![SubMsg::new(exec)])

    Ok(HandleResponse {
        messages: vec![CosmosMsg::Wasm(exec)],
        data: None,
        log: vec![],
    })

    // Ok(HandleResponse {
    //     messages: vec![
    //         CosmosMsg::Bank(BankMsg::Send {
    //             from_address: env.contract.address,
    //             to_address: HumanAddr("terra15dwd5mj8v59wpj0wvt233mf5efdff808c5tkal".to_string()),
    //             amount: vec![Coin {
    //                 denom: config.stable_denom,
    //                 amount: redeem_amount.into(),
    //             }],
    //         })
    //     ],
    //     data: None,
    // })

    // CosmosMsg::Bank(BankMsg::Send {
    //     from_address: env.contract.address,
    //     to_address: HumanAddr("terra15dwd5mj8v59wpj0wvt233mf5efdff808c5tkal".to_string()),
    //     amount: vec![Coin {
    //         denom: config.stable_denom,
    //         amount: redeem_amount.into(),
    //     }],
    // })

    // Ok(HandleResponse::default())
}

pub fn try_withdraw<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    withdraw_amount: Uint128,
    // count: i32,
) -> StdResult<HandleResponse> {
    let state = config_read(&deps.storage).load()?;

    // let msg = BankQuery::Balance {
    //     address: &env.contract.address,
    //     denom: "aust",
    // }
    // let exec = WasmMsg::Execute {
    //     contract_addr: state.anchor_contract_addr,
    //     msg: to_binary(&msg)?,
    //     send: vec![deduct_tax(&deps, Coin {
    //         denom: "uusd".to_string(),
    //         amount: deposit_amount ,
    //     })?],
    // };

    // Ok(HandleResponse {
    //     messages: vec![CosmosMsg::Wasm(exec)],
    //     data: None,
    //     log: vec![],
    // })

    // turn aUST back to UST
    // from: https://github.com/Anchor-Protocol/money-market-contracts/blob/main/contracts/market/src/contract.rs
    // https://github.com/Anchor-Protocol/money-market-contracts/blob/c13fb636c925e66e6470882d6eefb6fec7d64091/contracts/market/src/testing/tests.rs#L714
    let redeemStableMsg = Cw20HookMsg::RedeemStable {};
    let msg = AnchorMarketHandleMsg::Receive(
        Cw20ReceiveMsg{
            sender: env.contract.address,
            amount: withdraw_amount,
            msg: Some(to_binary(&redeemStableMsg).unwrap())
        }
    );
    let exec = WasmMsg::Execute {
        contract_addr: state.anchor_contract_addr,
        msg: to_binary(&msg)?,
        send: vec![],
    };

    // send back tokens: https://github.com/Anchor-Protocol/money-market-contracts/blob/c13fb636c925e66e6470882d6eefb6fec7d64091/contracts/market/src/testing/tests.rs#L739

    Ok(HandleResponse {
        messages: vec![CosmosMsg::Wasm(exec)],
        data: None,
        log: vec![],
    })
}

pub fn handle<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    msg: HandleMsg,
) -> StdResult<HandleResponse> {
    match msg {
        HandleMsg::Increment {} => try_increment(deps, env),
        HandleMsg::Reset { count } => try_reset(deps, env, count),
        HandleMsg::Deposit {} => try_deposit(deps, env),
        HandleMsg::Withdraw { withdraw_amount } => try_withdraw(deps, env, withdraw_amount),
    }
}

pub fn try_increment<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    _env: Env,
) -> StdResult<HandleResponse> {
    config(&mut deps.storage).update(|mut state| {
        state.count += 1;
        Ok(state)
    })?;

    Ok(HandleResponse::default())
}

pub fn try_reset<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    count: i32,
) -> StdResult<HandleResponse> {
    let api = &deps.api;
    config(&mut deps.storage).update(|mut state| {
        if api.canonical_address(&env.message.sender)? != state.owner {
            return Err(StdError::unauthorized());
        }
        state.count = count;
        Ok(state)
    })?;
    Ok(HandleResponse::default())
}

pub fn query<S: Storage, A: Api, Q: Querier>(
    deps: &Extern<S, A, Q>,
    msg: QueryMsg,
) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetCount {} => to_binary(&query_count(deps)?),
    }
}

fn query_count<S: Storage, A: Api, Q: Querier>(deps: &Extern<S, A, Q>) -> StdResult<CountResponse> {
    let state = config_read(&deps.storage).load()?;
    Ok(CountResponse { count: state.count })
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env};
    use cosmwasm_std::{coins, from_binary, StdError};

    #[test]
    fn proper_initialization() {
        let mut deps = mock_dependencies(20, &[]);

        let msg = InitMsg { count: 17 };
        let env = mock_env("creator", &coins(1000, "earth"));

        // we can just call .unwrap() to assert this was a success
        let res = init(&mut deps, env, msg).unwrap();
        assert_eq!(0, res.messages.len());

        // it worked, let's query the state
        let res = query(&deps, QueryMsg::GetCount {}).unwrap();
        let value: CountResponse = from_binary(&res).unwrap();
        assert_eq!(17, value.count);
    }

    #[test]
    fn increment() {
        let mut deps = mock_dependencies(20, &coins(2, "token"));

        let msg = InitMsg { count: 17 };
        let env = mock_env("creator", &coins(2, "token"));
        let _res = init(&mut deps, env, msg).unwrap();

        // beneficiary can release it
        let env = mock_env("anyone", &coins(2, "token"));
        let msg = HandleMsg::Increment {};
        let _res = handle(&mut deps, env, msg).unwrap();

        // should increase counter by 1
        let res = query(&deps, QueryMsg::GetCount {}).unwrap();
        let value: CountResponse = from_binary(&res).unwrap();
        assert_eq!(18, value.count);
    }

    #[test]
    fn reset() {
        let mut deps = mock_dependencies(20, &coins(2, "token"));

        let msg = InitMsg { count: 17 };
        let env = mock_env("creator", &coins(2, "token"));
        let _res = init(&mut deps, env, msg).unwrap();

        // beneficiary can release it
        let unauth_env = mock_env("anyone", &coins(2, "token"));
        let msg = HandleMsg::Reset { count: 5 };
        let res = handle(&mut deps, unauth_env, msg);
        match res {
            Err(StdError::Unauthorized { .. }) => {}
            _ => panic!("Must return unauthorized error"),
        }

        // only the original creator can reset the counter
        let auth_env = mock_env("creator", &coins(2, "token"));
        let msg = HandleMsg::Reset { count: 5 };
        let _res = handle(&mut deps, auth_env, msg).unwrap();

        // should now be 5
        let res = query(&deps, QueryMsg::GetCount {}).unwrap();
        let value: CountResponse = from_binary(&res).unwrap();
        assert_eq!(5, value.count);
    }
}
