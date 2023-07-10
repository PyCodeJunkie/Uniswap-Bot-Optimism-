const {ethers, BigNumber} = require("ethers")
const fs = require('fs');
const axios = require('axios');
const bn =  require('bignumber.js')      //  ← here we use BigNumber pure to give us more control of precision


// Initialize your Ethereum provider and signer
const deployerPrivateKey = "PRIVATE_KEY"
const provider = new ethers.providers.JsonRpcProvider('https://opt-mainnet.g.alchemy.com/v2/SuiOz99QLiMk2gE-8Yb3pWL5wkzszrzO');
const wallet = new ethers.Wallet(deployerPrivateKey, provider);

const {abi:UniswapV3Factory} = require("@uniswap/v3-core-optimism/artifacts-ovm/contracts/UniswapV3Factory.sol/UniswapV3Factory.json")
const {abi:UniswapV3Pool} = require("@uniswap/v3-core-optimism/artifacts-ovm/contracts/UniswapV3Pool.sol/UniswapV3Pool.json")
const {abi:Token } = require("@openzeppelin/contracts/build/contracts/ERC20.json");
const {abi:Qouter} = require("@uniswap/v3-periphery-optimism/artifacts-ovm/contracts/lens/Quoter.sol/Quoter.json")
const {abi:Qouter2} = require("@uniswap/v3-periphery-optimism/artifacts-ovm/contracts/lens/QuoterV2.sol/QuoterV2.json")


const UniswapV3FactoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984"
const QouterAddress = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
const Qouter2Address = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e"



const factory = new ethers.Contract(UniswapV3FactoryAddress, UniswapV3Factory, provider)

factory.on('PoolCreated', (token0, token1, fee, tickSpacing, pool) => {
    console.log(`Pool created with ${token0} & ${token1} at ${pool}`)
})
