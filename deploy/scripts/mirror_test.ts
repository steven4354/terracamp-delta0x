import { LCDClient, MnemonicKey, StdTx } from "@terra-money/terra.js";
import { Mirror } from "@mirror-protocol/mirror.js";

(async () => {
  try {
    const terra = new LCDClient({
      chainID: "columbus-4",
      URL: "https://lcd.terra.dev",
    });

    const mk = new MnemonicKey({
      mnemonic: process.env.TERRA_MNEMOMIC_KEY,
    });

    // const wallet = terra.wallet(mk);
    // {
    //     // lcd: terra,
    //     // key: mk,
    //     //   mint: "terra1s9ehcjv0dqj2gsl72xrpp0ga5fql7fj7y3kq3w"
    //   }
    const mirror = new Mirror({
        key: mk
    });

    const result = await mirror.factory.getConfig()
    console.log("STEVENDEBUG result ", result);
    
    // const wallet = mirror.lcd?.wallet(mirror.key);
    const wallet = terra.wallet(mk);

    const positionIdx = await mirror.mint.getNextPositionIdx();
    const currentPositions = await mirror.mint.getPositions(mk.accAddress)

    // cosnt asset = await mirror.mint.getAssetConfig('terra18yx7ff8knc98p07pdkhm3u36wufaeacv47fuha')

    console.log("STEVENDEBUG positionIdx ", positionIdx);
    console.log("STEVENDEBUG currentPositions ", currentPositions);

    const austContractAddrTestnet = "terra1ajt556dpzvjwl0kl5tzku3fc3p3knkg9mkv8jl";
    const mQQQContractAddrTestnet = "terra12s2h8vlztjwu440khpc0063p34vm7nhu25w4p9";
    const mTSLAContractAddrMainnet = "terra14y5affaarufk3uscy2vr6pe6w6zqf2wpjzn5sh";

    const openPositionCollateral = {
      info: {
        // token: {
        //   contract_addr: mTSLAContractAddrMainnet,
        // },
        native_token: {
            denom: 'uusd'
        }
      },
      amount: "2"
    }
    const openPosition = await mirror.mint.openPosition(
      openPositionCollateral,
      // {
      //   token: {
      //     contract_addr: mTSLAContractAddrMainnet,
      //   },
      // },
      openPositionCollateral.info,
      1.7,
    )
    console.log("STEVENDEBUG openPosition ", openPosition);
    const openPositionTx = await wallet?.createAndSignTx({
        msgs: [openPosition],
    });
    const openPositionTxResult = await mirror.lcd?.tx.broadcast(openPositionTx as StdTx);
    console.log("STEVENDEBUG openPositionTxResult ", openPositionTxResult);

    const asset = await mirror.mint.getAssetConfig(mTSLAContractAddrMainnet)
    console.log("STEVENDEBUG asset ", asset);

    // const test1 = mirror.mint.

    const deposit = mirror.mint.deposit(0, {
      info: {
        // token: {
        //   contract_addr: mTSLAContractAddrMainnet,
        // },
        native_token: {
            denom: 'uusd'
        }
      },
      amount: "1",
    });

    console.log("STEVENDEBUG deposit ", deposit);

    const depositTx = await wallet?.createAndSignTx({
        msgs: [deposit],
    });
    const depositTxResult = await mirror.lcd?.tx.broadcast(depositTx as StdTx);

    console.log("STEVENDEBUG depositTxResult ", depositTxResult);
  } catch (e) {
    console.log("STEVENDEBUG error ", e);
  }
})();
