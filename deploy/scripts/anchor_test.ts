import {
  Dec,
  Int,
  MsgExecuteContract,
  MsgInstantiateContract,
} from "@terra-money/terra.js";
import {
  LCDClient,
  MsgStoreCode,
  MnemonicKey,
  isTxError,
} from "@terra-money/terra.js";
import * as fs from "fs";

// on tequila
const DEPLOYED_ANCHOR_ADDR = "terra15dwd5mj8v59wpj0wvt233mf5efdff808c5tkal";
const DEPLOYED_AUST_ADDR = "terra15dwd5mj8v59wpj0wvt233mf5efdff808c5tkal";

// TODO: get the conversions from UST to aUST working with terrajs
// then transform that into a version with the contract

(async () => {
  try {
    const mk = new MnemonicKey({
      mnemonic: process.env.TERRA_MNEMOMIC_KEY,
    });

    const terra = new LCDClient({
      chainID: "tequila-0004",
      URL: "https://tequila-lcd.terra.dev",
    });

    const wallet = terra.wallet(mk);

    // deposit ust to anchor
    const deposit = new MsgExecuteContract(
        wallet.key.accAddress,
        DEPLOYED_ANCHOR_ADDR,
        {
            deposit_stable: {},
        },
        { uusd: 10000 } // send coins
    );
    const depositTx = await wallet.createAndSignTx({
      msgs: [deposit],
    });
    const depositTxResult = await terra.tx.broadcast(depositTx);
    console.log("STEVENDEBUG depositTxResult ", depositTxResult);

    // get ust back from anchor
    // from: https://github.com/Anchor-Protocol/anchor.js/blob/master/src/fabricators/money-market/market-redeem-stable.ts
    const aUstAmount = 0.1
    const withdraw = new MsgExecuteContract(
        wallet.key.accAddress,
        DEPLOYED_ANCHOR_ADDR,
        {
            send: {
                contract: marketAddress,
                amount: new Int(new Dec(aUstAmount).mul(1000000)).toString(),
                msg: createHookMsg({
                  redeem_stable: {},
                }),
              },
        },
        // { ausd: 9000 } // send coins
    );
    const withdrawTx = await wallet.createAndSignTx({
      msgs: [withdraw],
    });
    const withdrawTxResult = await terra.tx.broadcast(withdrawTx);
    console.log("STEVENDEBUG depositTxResult ", withdrawTxResult);
    
  } catch (e) {
    console.log("STEVENDEBUG error ", e);
  }
})();
