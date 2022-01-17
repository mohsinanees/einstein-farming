const fs = require("fs");
const HDWalletProvider = require("truffle-hdwallet-provider"); //HD Wallet provider
const web3 = require("web3");
const userData = require("./userData.json");
const { mnemonic } = require("../secret.json");

// Read config variables
const MNEMONIC = mnemonic; //wallet MNEMONIC
const CONTRACT_ADDRESS = "0xec3a158883bDAdE868C86a9B6f8B8206075B46ee";
const SIGNER_ADDRESS = "0x1C4A0724DC884076B9196FFf7606623409613Adf";

// ABI used to encode information while interacting onchain smart contract functions
const CONTRACT_ABI = require("./EinsteinFarming.json").abi;

if (!MNEMONIC) {
    console.error(
        "Please set a mnemonic, Alchemy/Infura key, owner, network, and contract address."
    );
    return;
}

let provider;
let web3Instance;
var contract;

// let web3SocketInstance;

const setUpWeb3 = async function () {
    provider = new HDWalletProvider(MNEMONIC, "https://cool-blue-resonance.bsc.quiknode.pro/6edd98a1bc4b399442ea9581007e96a1f225ccf0/");

    web3Instance = new web3(provider); //create a web3 instance
    contract = new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
    console.log(contract.methods);
};

const upgradeUsers = async function (address, lptoken, balances, timestamps, claimedReward) {
    await contract.methods
        .upgradeUsers(address, lptoken, balances, timestamps, claimedReward)
        .send({ from: SIGNER_ADDRESS, chainId: 56 })
        .then(async (result) => {
            console.log(result.transactionHash);
        })
        .catch((error) => console.log(error));
};

const removeUsers = async function (address, lptoken) {
    await contract.methods
        .removeUsers(address, lptoken)
        .send({ from: SIGNER_ADDRESS, chainId: 56 })
        .then(async (result) => {
            console.log(result.transactionHash);
        })
        .catch((error) => console.log(error));
};

const main = async () => {
    await setUpWeb3();
    // let removedUsers = ["0x5B6b556919D7585eAEcc01637139DBe705E20972", "0x218445f14CbE8bB0171B45F1A22C3b45DAf21AF5", "0xeB576E9C70Ca239E8dB186aFAc661C5d5736Ea6D"];
    let users = Object.keys(userData);
    for (let i = 0; i < removedUsers.length;) {
        let address = users[i];
        let lptoken = "0xb9eef6bcc6ee43bbe4e067fd87eec9bdc625e9a8";
        let balances = [...userData[users[i]].balances];
        let timestamps = [...userData[users[i]].timestamps];
        let claimedRewards;
        if (userData[users[i]].rewards !== undefined) {
            claimedRewards = userData[users[i]].rewards[0];
        } else {
            claimedRewards = 0;
        }
        console.log(address, balances, timestamps, claimedRewards);
        try {
            // await upgradeUsers(address, lptoken, balances, timestamps, claimedRewards);
            // await removeUsers(removedUsers[i], lptoken);
            i++;
        } catch (err) {
            console.log(err);
        }
    }
};

main();
