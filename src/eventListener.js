const Web3 = require("web3");
const HDWalletProvider = require("truffle-hdwallet-provider"); //HD Wallet provider
const fs = require("fs");

const { mnemonic } = require("../secret.json");
const contractABI = require(`./EinsteinFarming.json`).abi;
const contractAddress = "0xec3a158883bDAdE868C86a9B6f8B8206075B46ee";

const web3 = new Web3(
    new HDWalletProvider(mnemonic, `https://speedy-nodes-nyc.moralis.io/e3771a4194ca1a8d20c96277/bsc/mainnet`),
);
// const web3Socket = new Web3(
//     new Web3.providers.WebsocketProvider(
//         `wss://speedy-nodes-nyc.moralis.io/af271fa0290d1b4fdf0a5b35/polygon/mainnet/ws`
//     )
// );

const web3Socket = new Web3(
    new Web3.providers.WebsocketProvider(
        `wss://cool-blue-resonance.bsc.quiknode.pro/6edd98a1bc4b399442ea9581007e96a1f225ccf0/`
    )
);

let contract = new web3.eth.Contract(contractABI, contractAddress);
let contractSocket = new web3Socket.eth.Contract(contractABI, contractAddress);
// console.log(contract.events)
// contract.events
//     .TransferSingle({ fromBlock: 0 })
//     .on("data", function (event) {
//         console.log(event);

//     })
//     .on("error", (err) => console.log(err));

async function getEvents() {
    let index = 12166453;
    let result = [];
    for (let i = 0; i < 150; i++) {
        let events = await contractSocket.getPastEvents("allEvents", {
            fromBlock: index,
            toBlock: index + 10000,
        });
        console.log(events);
        result.push(events);
        await fs.appendFileSync("events-app.json", JSON.stringify(result, null, 2));
        index += 10000;
    }
    await fs.writeFileSync("events.json", JSON.stringify(result, null, 2));
}

getEvents();