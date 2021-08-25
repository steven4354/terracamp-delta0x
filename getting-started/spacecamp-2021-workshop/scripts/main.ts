import * as path from "path";
import BN from "bn.js";
import chalk from "chalk";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { LocalTerra, LCDClient, MsgExecuteContract, MnemonicKey } from "@terra-money/terra.js";
import {
  toEncodedBinary,
  sendTransaction,
  storeCode,
  instantiateContract,
  queryNativeTokenBalance,
  queryTokenBalance,
} from "./helpers";

chai.use(chaiAsPromised);
const { expect } = chai;

//----------------------------------------------------------------------------------------
// Variables
//----------------------------------------------------------------------------------------

// swap to deploy to testnet
// const terra = new LocalTerra();
const terra = new LCDClient({
  chainID: 'bombay-10',
  URL: 'https://bombay-lcd.terra.dev'
});

// const deployer = terra.wallets.test1;
const deployer = terra.wallet(
  new MnemonicKey({
    mnemonic: process.env.TERRA_MNEMOMIC_KEY
  })
)
const user1 = terra.wallet(
  new MnemonicKey({
    mnemonic: process.env.TERRA_MNEMOMIC_KEY
  })
)
// TODO: add a new one?
const user2 = terra.wallet(
  new MnemonicKey({
    mnemonic: process.env.TERRA_MNEMOMIC_KEY
  })
)

let mirrorToken: string;
let terraswapPair: string;
let terraswapLpToken: string;

//----------------------------------------------------------------------------------------
// Setup
//----------------------------------------------------------------------------------------

async function setupTest() {
  // Step 1. Upload Terra contract code
  process.stdout.write("Uploading Terra smart contract code... ");

  const cw20CodeId = await storeCode(
    terra,
    deployer,
    path.resolve(__dirname, "../artifacts/my_first_contract.wasm")
  );

  console.log(chalk.green("Done!"), `${chalk.blue("codeId")}=${cw20CodeId}`);

  // Step 2. Instantiate Terra contract code
  process.stdout.write("Instantiating Terra smart contract... ");

  const contractResult = await instantiateContract(terra, deployer, deployer, cw20CodeId, {
    "count": 0
  });

  console.log("STEVENDEBUG")
  console.log(contractResult)

  return

  mirrorToken = contractResult.logs[0].events[0].attributes[3].value;

  console.log(chalk.green("Done!"), `${chalk.blue("contractAddress")}=${mirrorToken}`);

  // Step 3. Upload TerraSwap Pair code
  process.stdout.write("Uploading TerraSwap pair code... ");

  const codeId = await storeCode(
    terra,
    deployer,
    path.resolve(__dirname, "../artifacts/terraswap_pair.wasm")
  );

  console.log(chalk.green("Done!"), `${chalk.blue("codeId")}=${codeId}`);

  // Step 4. Instantiate TerraSwap Pair contract
  process.stdout.write("Instantiating TerraSwap pair contract... ");

  const pairResult = await instantiateContract(terra, deployer, deployer, codeId, {
    asset_infos: [
      {
        token: {
          contract_addr: mirrorToken,
        },
      },
      {
        native_token: {
          denom: "uusd",
        },
      },
    ],
    token_code_id: cw20CodeId,
  });

  const event = pairResult.logs[0].events.find((event) => {
    return event.type == "instantiate_contract";
  });

  terraswapPair = event?.attributes[3].value as string;
  terraswapLpToken = event?.attributes[7].value as string;

  console.log(
    chalk.green("Done!"),
    `${chalk.blue("terraswapPair")}=${terraswapPair}`,
    `${chalk.blue("terraswapLpToken")}=${terraswapLpToken}`
  );

  // Step 5. Mint tokens for use in testing
  process.stdout.write("Fund user 1 with MIR... ");

  await sendTransaction(terra, deployer, [
    new MsgExecuteContract(deployer.key.accAddress, mirrorToken, {
      mint: {
        recipient: user1.key.accAddress,
        amount: "10000000000",
      },
    }),
  ]);

  console.log(chalk.green("Done!"));

  process.stdout.write("Fund user 2 with MIR... ");

  await sendTransaction(terra, deployer, [
    new MsgExecuteContract(deployer.key.accAddress, mirrorToken, {
      mint: {
        recipient: user2.key.accAddress,
        amount: "10000000000",
      },
    }),
  ]);

  console.log(chalk.green("Done!"));
}

//----------------------------------------------------------------------------------------
// Main
//----------------------------------------------------------------------------------------

(async () => {
  console.log(chalk.yellow("\nStep 1. Info"));

  console.log(`Use ${chalk.cyan(deployer.key.accAddress)} as deployer`);
  console.log(`Use ${chalk.cyan(user1.key.accAddress)} as user 1`);
  console.log(`Use ${chalk.cyan(user2.key.accAddress)} as user 1`);

  console.log(chalk.yellow("\nStep 2. Setup"));

  await setupTest();

  console.log(chalk.yellow("\nStep 3. Tests"));

    //   await testProvideLiquidity();
    //   await testSwap();
    //   await testSlippage();

  console.log("");
})();
