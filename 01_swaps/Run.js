const {ethers} = require('ethers');
const fs = require("fs")
// Signer
const deployerPrivateKey = "PRIVATE_KEY"
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
const wallet = new ethers.Wallet(deployerPrivateKey, provider);

const uniswapV3RouterAddress = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"
const UniswapV3Router02ABI = require("./ABIS/UniswapV3Router02.json")
const {abi:UniswapV3Pool} = require("../02_GetPools/node_modules/@uniswap/v3-core-optimism/artifacts-ovm/contracts/UniswapV3Pool.sol/UniswapV3Pool.json")

const WETH = "0x4200000000000000000000000000000000000006"
const USDT = "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58";
const USDC = "0x7f5c764cbc14f9669b88837ca1490cca17c31607";
const DAI = "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1"
// Token contracts

const wethContractABI = require('./ABIS/WETH.json');
const wethContract = new ethers.Contract(WETH, wethContractABI, wallet);

const usdtContractABI = require('./ABIS/USDT.json');
const usdtContract = new ethers.Contract(USDT, usdtContractABI, wallet);

const usdcContractABI = require('./ABIS/USDC.json');
const usdcContract = new ethers.Contract(USDC, usdcContractABI, wallet);


const daiContractABI = require('./ABIS/DAI.json');
const daiContract = new ethers.Contract(DAI, usdcContractABI, wallet);
// functions


  const uniswapV3Pool = new ethers.Contract("POOL_ADDRESS", UniswapV3Pool, wallet);
const Big = require('big.js');

  async function swapTokens(recipient, zeroForOne, amountSpecified, sqrtPriceLimitX96, data) {
    const parsedAmountSpecified = Big(amountSpecified.toString()).times(Big(10).pow(18)); // Convert to the appropriate decimal precision

    const tx = await uniswapV3Pool.swap(recipient, zeroForOne, parsedAmountSpecified.toFixed(),0, data, { gasLimit: 1000000 });
    console.log('Swap transaction:', tx.hash);
    await tx.wait();

    console.log('Swap completed successfully.');
  }

  // Example usage
  const recipient = wallet.address; // Replace with the address to receive the swapped tokens
  const zeroForOne = true; // Set to true for token0 to token1 swap, or false for token1 to token0 swap
  const amountSpecified = 1; // Replace with the desired amount of tokens to swap
    const data = '0x'; // Additional data (if any) for the swap

  swapTokens(recipient, zeroForOne, amountSpecified, "3420232791999119114650446", data)
    .catch((error) => {
      console.error('Error:', error);
    });

    const priceToSqrtPricex = (price) => {
      const parsedPrice = Big(price);
      const result = Big(Math.floor(parsedPrice.sqrt().times(2).pow(96)));
      return result.toString();
    };

async function CheckBalances() {
  // Token Addresses



    console.log("--------------------Getting-Balance--------------------------------");
    const Bal = await wallet.getBalance();
    const bal = ethers.utils.formatEther(Bal);
    console.log(`[ETH] Balance:\t ${bal}`);

    const wethBalance = await wethContract.balanceOf(wallet.address);
    console.log('[WETH] Balance:\t', wethBalance.toString());

    const usdtBalance = await usdtContract.balanceOf(wallet.address);
    console.log('[USDT] Balance:\t', usdtBalance.toString());

    const usdcBalance = await usdcContract.balanceOf(wallet.address);
    console.log('[USDC] Balance:\t', usdcBalance.toString());

  const daiBalance = await daiContract.balanceOf(wallet.address);
    console.log('[DAI] Balance:\t', daiBalance.toString());
    console.log("-----------------[xxxxxxxxxxxxx]------------------------------------");
}
async function UniswapSwap(AmountIn,tokenInAddress,tokenOutAddress,fee) {


    const uniswapV3Router = new ethers.Contract(uniswapV3RouterAddress, UniswapV3Router02ABI, wallet);

    const amountIn = ethers.utils.parseEther(AmountIn,18); // Amount of tokenIn to swap
    const amountOutMinimum = ethers.utils.parseUnits('0'); // Minimum amount of tokenOut expected

    const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // Set the deadline 10 minutes from now

const swapParams = {
  tokenIn: tokenInAddress,
  tokenOut: tokenOutAddress,
  fee: fee,
  recipient: wallet.address,
  deadline: deadline,
  amountIn: amountIn,
  amountOutMinimum: amountOutMinimum,
  sqrtPriceLimitX96: 0,
};


console.log("--------------------Approving-UniswapV3Router02-------------------------------");

  const maxAllowance = ethers.constants.MaxUint256;
  await wethContract.connect(wallet).approve(uniswapV3RouterAddress, maxAllowance);
// Call the exactInputSingle function

console.log("\n-------------------Waiting-To-Swap-Tokens--------------------------------");
  const tx = await uniswapV3Router.exactInputSingle(swapParams,{gasLimit:1000000});
  console.log("\nTransaction Hash:", tx.hash);


      console.log("\nUniswap - Sandwich transaction completed successfully!\n\n");



console.log("--------------------[xxxxxxxxxxxxxxxx]--------------------------------");
}

async function Mint_WETH(AmountIn, TokenAddress=WETH) {

    const amountIn = ethers.utils.parseEther(AmountIn, 18);
    const tokenIn =  TokenAddress;
    const recipient = wallet.address;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

    const tx = await wallet.sendTransaction({
        to: tokenIn,
        value: amountIn,
        gasLimit: 1000000,
    });
    await tx.wait();
    console.log("\n------------------Confirming-Transaction----------------------------")
    console.log('\tSwap executed successfully!\n', tx.hash);
    console.log(`\n---------------${AmountIn}-ETH-Just-Minted-->WETH-------------------------`)
    await CheckBalances();

}

async function main() {

await CheckBalances()
await Mint_WETH("10.001")

const tokenInAddress = "0x4200000000000000000000000000000000000006"; // WETH
const tokenOutAddress = "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1" // OP COIN

//"0x7f5c764cbc14f9669b88837ca1490cca17c31607" // USDC
//"0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"; // USDT
const fee = 3000; // Fee amount: 500 (0.05%)

//await UniswapSwap("10",tokenInAddress,tokenOutAddress,fee)

//await CheckBalances()

}

main()



/*
// Read token addresses from file
const tokenAddressesFile = 'TOKEN_LIST.txt';
const tokenAddresses = fs.readFileSync(tokenAddressesFile, 'utf-8').split('\n').filter(Boolean);

// Tokens & Fees
const fees = [500, 10000, 3000];

for (let i = 0; i < tokenAddresses.length; i++) {
    const tokens = tokenAddresses[i];
    console.log(tokens)

    for (const fee of fees) {

    }


  }
*/
