import { MsgInstantiateContract } from "@terra-money/terra.js";
import {
  LCDClient,
  MsgStoreCode,
  MnemonicKey,
  isTxError,
} from "@terra-money/terra.js";
import * as fs from "fs";

(async () => {
  try {
    // test1 key from localterra accounts
    const mk = new MnemonicKey({
      mnemonic: process.env.TERRA_MNEMOMIC_KEY,
    });

    // connect to localterra
    // const terra = new LCDClient({
    //   URL: 'http://localhost:1317',
    //   chainID: 'localterra'
    // })
    const terra = new LCDClient({
      chainID: "tequila-0004",
      URL: "https://tequila-lcd.terra.dev",
    });

    const wallet = terra.wallet(mk);

    const storeCode = new MsgStoreCode(
      wallet.key.accAddress,
      fs.readFileSync("../artifacts/my_first_contract.wasm").toString("base64")
    );
    const storeCodeTx = await wallet.createAndSignTx({
      msgs: [storeCode],
    });
    const storeCodeTxResult = await terra.tx.broadcast(storeCodeTx);

    console.log(storeCodeTxResult);

    if (isTxError(storeCodeTxResult)) {
      throw new Error(
        `store code failed. code: ${storeCodeTxResult.code}, codespace: ${storeCodeTxResult.codespace}, raw_log: ${storeCodeTxResult.raw_log}`
      );
    }

    const {
      store_code: { code_id },
    } = storeCodeTxResult.logs[0].eventsByType;

    console.log("STEVENDEBUG code_id", typeof code_id);

    const code_id_num = Number.parseFloat(code_id[0]);

    console.log("STEVENDEBUG code_id", typeof code_id_num);
    console.log("STEVENDEBUG code_id", code_id_num.toFixed());

    //   wallet.key.accAddress,
    //   wallet.key.accAddress,
    //   code_id_num, // code ID
    //   {reset: {
    //     count: 5
    //   }}, // InitMsg
    //   { uluna: 10000000, ukrw: 1000000 }, // init coins

    const instantiate = new MsgInstantiateContract(
      wallet.key.accAddress,
      code_id_num,
      {
        reset: {
          count: 5,
        },
      },
      { uluna: 10000000, ukrw: 1000000 } // init coins
    );

    console.log("STEVENDEBUG instantiate", instantiate);

    const instantiateTx = await wallet.createAndSignTx({
      msgs: [instantiate],
    });

    console.log("STEVENDEBUG instantiateTx", instantiateTx);

    const instantiateTxResult = await terra.tx.broadcast(instantiateTx);

    console.log("STEVENDEBUG instantiateTxResult ", instantiateTxResult);

    console.log(instantiateTxResult);

    if (isTxError(instantiateTxResult)) {
      throw new Error(
        `instantiate failed. code: ${instantiateTxResult.code}, codespace: ${instantiateTxResult.codespace}, raw_log: ${instantiateTxResult.raw_log}`
      );
    }

    const {
      instantiate_contract: { contract_address },
    } = instantiateTxResult.logs[0].eventsByType;
  } catch (e) {
    console.log("STEVENDEBUG error ", e);
  }
})();
