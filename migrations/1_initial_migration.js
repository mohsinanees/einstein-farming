const EinsteinFarming = artifacts.require("EinsteinFarming");
const LpToken = artifacts.require("LpToken");
const RewardToken = artifacts.require("RewardToken");
const { deployProxy, upgradeProxy } = require("@openzeppelin/truffle-upgrades");
const Web3 = require("web3");

module.exports = async function (deployer, network) {
    if (network === "development") {
        var web3 = new Web3("http://127.0.0.1:8545");
        const currentTime = Math.floor(new Date().getTime() / 1000);

        // For testing alone
        await deployer.deploy(LpToken);
        await deployer.deploy(RewardToken);
        let lp = await LpToken.deployed();
        let rewardToken = await RewardToken.deployed();
        const LP_TOKEN = lp.address;
        const EINSTEIN_TOKEN = rewardToken.address;
        const REWARD_RATE = web3.utils.toBN(60 * 10 ** 18);
        const REWARD_INTERVAL_IN_SECONDS = web3.utils.toBN(24);
        const START_BLOCK = web3.utils.toBN((await web3.eth.getBlockNumber()) + 1);
        const LOCK_PERIOD_IN_SECONDS = web3.utils.toBN(15);
        const END_TIME = web3.utils.toBN(currentTime + 31449600);
        const FARMED_TOTAL = web3.utils.toBN(0);
        // Farming deploy
        let farming = await deployProxy(EinsteinFarming, [], { deployer, initializer: "initialize" });
        await farming
            .addPool(
                LP_TOKEN,
                EINSTEIN_TOKEN,
                REWARD_RATE,
                REWARD_INTERVAL_IN_SECONDS,
                START_BLOCK,
                LOCK_PERIOD_IN_SECONDS,
                END_TIME,
                FARMED_TOTAL
            );
    }
    if (network === "testnet") {
        await deployer.deploy(LpToken);
        await deployer.deploy(RewardToken);
        // Farming deploy
        await deployProxy(PDOGFarming, [], { deployer, initializer: "initialize" });
    }

    if (network === "bscmainnet") {
        var web3 = new Web3("https://bsc-dataseed.binance.org");
        const currentTime = Math.floor(new Date().getTime() / 1000);
        // // Farming deploy
        // let farm = await deployProxy(PDOGFarming, [], { deployer, initializer: "initialize" });
        // Creating pool
        let farm = new web3.eth.Contract(
            PDOGFarming.abi,
            "0xec3a158883bDAdE868C86a9B6f8B8206075B46ee"
        );
        const LP_TOKEN = "0xb9eef6bcc6ee43bbe4e067fd87eec9bdc625e9a8";
        const EINSTEIN_TOKEN = "0xBd65a197408230247F05247A71D1A9Aea9Db0C3c";
        const REWARD_RATE = web3.utils.toBN(60 * 10 ** 18);
        const REWARD_INTERVAL_IN_SECONDS = web3.utils.toBN(2419200);
        const START_BLOCK = web3.utils.toBN((await web3.eth.getBlockNumber()) + 1);
        const LOCK_PERIOD_IN_SECONDS = web3.utils.toBN(259200);
        const END_TIME = web3.utils.toBN(currentTime + 31449600);
        const FARMED_TOTAL = web3.utils.toBN(0);
        // await farm.methods
        //     .addPool(
        //         LP_TOKEN,
        //         EINSTEIN_TOKEN,
        //         REWARD_RATE,
        //         REWARD_INTERVAL_IN_SECONDS,
        //         START_BLOCK,
        //         LOCK_PERIOD_IN_SECONDS,
        //         END_TIME,
        //         FARMED_TOTAL
        //     )
        //     .send({ from: deployer.provider.addresses[0] })
        //     .on("receipt", (res) => {
        //         console.log(res);
        //     });
        const PROXY_ADDRESS = "0xec3a158883bDAdE868C86a9B6f8B8206075B46ee";
        await upgradeProxy(PROXY_ADDRESS, EinsteinFarming, { deployer });
    }
};
