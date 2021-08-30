import {
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

const DEPLOYED_DELTA0X_ADDR = "terra1348jqg48gsesdx66ha6zcgp2hpcamjju5fh4zl";
// https://finder.terra.money/tequila-0004/address/terra1348jqg48gsesdx66ha6zcgp2hpcamjju5fh4zl

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

    // deposit
    const deposit = new MsgExecuteContract(
      wallet.key.accAddress,
      DEPLOYED_DELTA0X_ADDR,
      {
        deposit: {},
      },
      { uusd: 10000, ukrw: 10000 } // init coins
    );
    const depositTx = await wallet.createAndSignTx({
      msgs: [deposit],
    });
    const depositTxResult = await terra.tx.broadcast(depositTx);
    console.log("STEVENDEBUG depositTxResult ", depositTxResult);

    // withdraw
    const withdraw = new MsgExecuteContract(
      wallet.key.accAddress,
      DEPLOYED_DELTA0X_ADDR,
      {
        withdraw: {
          withdraw_amount: "100"
        },
      },
    );
    const withdrawTx = await wallet.createAndSignTx({
      msgs: [withdraw],
    });
    const withdrawTxResult = await terra.tx.broadcast(withdrawTx);
    console.log("STEVENDEBUG withdrawTxResult ", withdrawTxResult);

  } catch (e) {
    console.log("STEVENDEBUG error ", e);
  }
})();
