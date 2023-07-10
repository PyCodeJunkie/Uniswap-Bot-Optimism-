const {ethers, BigNumber} = require("ethers")
const fs = require('fs');
const axios = require('axios');
const bn =  require('bignumber.js')      //  ← here we use BigNumber pure to give us more control of precision
const JSBI = require('jsbi')
const { TickMath, FullMath } = require('@uniswap/v3-sdk')

const {abi:UniswapV3Factory} = require("@uniswap/v3-core-optimism/artifacts-ovm/contracts/UniswapV3Factory.sol/UniswapV3Factory.json")
const {abi:UniswapV3Pool} = require("@uniswap/v3-core-optimism/artifacts-ovm/contracts/UniswapV3Pool.sol/UniswapV3Pool.json")
const { abi:Token } = require("@openzeppelin/contracts/build/contracts/ERC20.json");
const {abi:Quoter} = require("@uniswap/v3-periphery-optimism/artifacts-ovm/contracts/lens/Quoter.sol/Quoter.json")
const {abi:Quoter2} = require("@uniswap/v3-periphery-optimism/artifacts-ovm/contracts/lens/QuoterV2.sol/QuoterV2.json")


// Initialize your Ethereum provider and signer
const deployerPrivateKey = "PRIVATE_KEY"
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
const wallet = new ethers.Wallet(deployerPrivateKey, provider);


const UniswapV3FactoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984"
const QouterAddress = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
const Qouter2Address = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e"


const QuoterContract = new ethers.Contract(QouterAddress,Quoter,provider)
const Quoter2Contract = new ethers.Contract(QouterAddress,Quoter2,provider)



//bn.config allows us to extend precision of the math in the BigNumber script
bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 })
function encodePriceSqrt(reserve1, reserve0){
  return BigNumber.from(
    new bn(reserve1.toString()).div(reserve0.toString()).sqrt()
      .multipliedBy(new bn(2).pow(96))
      .integerValue(3)
      .toString()
  )
}

              // reserve1         ,  reserve0
const x = encodePriceSqrt(1000000000000000000, 1539296453)

async function sqrtToPrice(sqrt,decimals0,decimals1,token0IsInput = true) {

  const numerator = sqrt ** 2
  const denominator = 2 ** 192
  let ratio = numerator / denominator
  const shiftDecimals = Math.pow(10,decimals0 - decimals1)
  ratio = ratio * shiftDecimals
  if(!token0IsInput) {
      ratio = 1 / ratio
  }
  return ratio
}

async function priceImpact(token0,token1,fee,amountIn) {
  const factory = new ethers.Contract(UniswapV3FactoryAddress, UniswapV3Factory, provider)

  const poolAddress = factory.getPool(token0,token1,fee)

  if (poolAddress == "0x0000000000000000000000000000000000000000") {
    console.log("pool not found");
  }

  const poolContract = new ethers.Contract(
    poolAddress,
    UniswapV3Pool,
    provider,
  )

    const slot0 = await poolContract.slot0()
    const sqrtPriceX96 = slot0.sqrtPriceX96

    const Token0 = await poolContract.token0()
    const Token1 = await poolContract.token1()

    const token0IsInput = token0 === Token0

    const tokenInContract = new ethers.Contract(token0,Token,provider)
    const tokenOutContract = new ethers.Contract(token1,Token,provider)

    const decimalsIn = await tokenInContract.decimals()
    const decimalsOut = await tokenOutContract.decimals()

    const quoter = new ethers.Contract(Qouter2Address,Quoter2,provider)

    const params = {
      tokenIn: token0,
      tokenOut: token1,
      fee: fee,
      amountIn: amountIn,
      sqrtPriceLimitX96: "0",
    }

    const quote = await quoter.callStatic.quoteExactInputSingle(params)

    const sqrtPriceX96After = qoute.sqrtPriceX96

    const price = sqrtToPrice(sqrtPriceX96, decimalsIn, decimalsOut, token0IsInput)
    const priceAfter = sqrtToPrice(sqrtPriceX96After, decimalsIn, decimalsOut, token0IsInput)

    console.log("price", price);
    console.log("priceAfter", price);

    const absoluteChange = price - priceAfter
    console.log(absoluteChange);
    const percentChange = absoluteChange / price
    console.log("percent change ", (percentChange * 100), "%");
}


async function calculateLiquidity(reserveX, reserveY) {
    const k = ethers.BigNumber.from(reserveX).mul(reserveY);
    const kNumber = parseFloat(k.toString());
    const LNumber = Math.sqrt(kNumber);
    const L = ethers.BigNumber.from(Math.floor(LNumber).toString());


    const formattedLiquidity = ethers.utils.formatUnits(L.toString(), 0);
    const formattedReserveX = ethers.utils.formatUnits(reserveX, 18);
    const formattedReserveY = ethers.utils.formatUnits(reserveY, 18);

    console.log('Liquidity Information:');
    console.log('-----------------------');
    console.log(`Reserve X: ${formattedReserveX}`);
    console.log(`Reserve Y: ${formattedReserveY}`);
    console.log(`Liquidity: ${formattedLiquidity}`);


}


function calculateProfitLoss(sqrtPriceX96, tick, fee, token0Decimals, token1Decimals) {
  const tickSpacing = 10;
  const feePercentage = fee / 10000;

  // Calculate price in terms of token0 per token1
  const price = Math.sqrt(sqrtPriceX96 / (2 ** 192));

  // Calculate the tick price range
  const tickPrice = Math.pow(1.0001, tick);
  const tickPriceRange = tickPrice * Math.pow(1.0001, tickSpacing) / tickPrice;

  // Calculate profit or loss percentage
  const profitLossPercentage = tickPriceRange * (1 - feePercentage) - 1;

  // Calculate profit or loss amount based on token0 and token1 decimals
  const profitLossAmount = profitLossPercentage * 100;

  return {
    price: price,
    profitLossPercentage: profitLossPercentage * 100,
    profitLossAmount: profitLossAmount
  };
}
async function qoute(token0, token1, fee , amountIn, sqrtPriceX96, poolAddress) {

  const poolContract = new ethers.Contract(poolAddress, UniswapV3Pool, provider);
    const token00 = await poolContract.token0();
  const token10 = await poolContract.token1();

    const token0Contract = new ethers.Contract(token00, Token, provider);
  const token1Contract = new ethers.Contract(token10, Token, provider);

  const token0Symbol = await token0Contract.symbol();
  const token1Symbol = await token1Contract.symbol();

const amountOut = await QuoterContract.callStatic.quoteExactInputSingle(
  token0,
  token1,
  fee,
  amountIn,
  sqrtPriceX96
)

  console.log("\n\n--- What if i buy or sell ---");
  console.log(
    "I get amountOut ->",
    ethers.utils.formatUnits(amountOut.toString(),18), "We are only using ", ethers.utils.formatUnits(amountIn,18), token0Symbol,"=>",token1Symbol );
  console.log("\n\n---[xxxxxxxxxxxxxxxxxxxx]---");


}
async function getPoolInformation(poolAddress) {
  const poolContract = new ethers.Contract(poolAddress, UniswapV3Pool, provider);
  const token0 = await poolContract.token0();
  const token1 = await poolContract.token1();
    const fee = await poolContract.fee();
  const tickSpacing = await poolContract.tickSpacing();






    const token0Contract = new ethers.Contract(token0, Token, provider);
    const token1Contract = new ethers.Contract(token1, Token, provider);

    var reserveX = await token0Contract.balanceOf(token0); // Example reserveX value
    var reserveY = await token1Contract.balanceOf(token1); // Example reserveY value
    console.log(reserveY.toString(),reserveX.toString());

  const token0Symbol = await token0Contract.symbol();
  const token1Symbol = await token1Contract.symbol();

  const token0Decimals = await token0Contract.decimals()
  const token1Decimals = await token1Contract.decimals()


  const slot0 = await poolContract.slot0();
//  console.log(slot0);

    const sqrtPriceX96 = slot0.sqrtPriceX96;
  const tick = slot0.tick.toString();
  const observationIndex = slot0.observationIndex.toString();
  const observationCardinality = slot0.observationCardinality.toString();
  const observationCardinalityNext = slot0.observationCardinalityNext.toString();
  const feeProtocol = slot0.feeProtocol.toString();
  const unlocked = slot0.unlocked;


 console.log("--- Pool Information ---");
  console.log("Token 0 Symbol:", token0Symbol);
  console.log("Token 1 Symbol:", token1Symbol);
  console.log("Sqrt Price X96:", sqrtPriceX96);
  console.log("Tick:", tick);
  console.log("Observation Index:", observationIndex);
  console.log("Observation Cardinality:", observationCardinality);
  console.log("Observation Cardinality Next:", observationCardinalityNext);
  console.log("Fee Protocol:", feeProtocol);
  console.log("Unlocked:", unlocked);
  console.log("Tick Spacing:", tickSpacing.toString());
  console.log("Fee:", ethers.utils.formatUnits(fee.toString(), 6), "%");
  console.log("-----------------------");


  //  console.log(poolContract);

  const result = await calculateProfitLoss(sqrtPriceX96, tick, fee, token0Decimals, token1Decimals)
  console.log("Price:", result.price);
console.log("Profit/Loss Percentage:", result.profitLossPercentage.toFixed(2), "%");
console.log("Profit/Loss Amount:", result.profitLossAmount.toFixed(2));

}
async function calculateProfits(poolAddress) {
  // Fetch pool information
  const poolContract = new ethers.Contract(poolAddress, UniswapV3Pool, provider);
  const slot0 = await poolContract.slot0();
  const sqrtPriceX96 = slot0.sqrtPriceX96.toString();

  // Retrieve token prices from an external API or price oracle
  const token0Price = await fetchTokenPrice(token0Address); // Replace with your own token price retrieval logic
  const token1Price = await fetchTokenPrice(token1Address); // Replace with your own token price retrieval logic

  // Calculate the current token amounts in the pool based on the square root price and reserves
  const token0Reserve = await poolContract.token0();
  const token1Reserve = await poolContract.token1();
  const token0Amount = token0Reserve.mul(sqrtPriceX96).div(ethers.constants.WeiPerEther);
  const token1Amount = token1Reserve.mul(sqrtPriceX96).div(ethers.constants.WeiPerEther);

  // Calculate the current value of token amounts in USD based on token prices
  const token0Value = token0Amount.mul(token0Price);
  const token1Value = token1Amount.mul(token1Price);

  // Calculate potential profits based on the current token values
  const potentialProfit = token1Value.sub(token0Value);

  return potentialProfit;
}
async function fetchTokenPrice(tokenAddress) {
  // Implement your own logic to fetch token price from an external API or price oracle
  // Replace this with your own implementation
  // Example: Using a mock function to return a dummy token price
  const tokenPrice = await mockFetchTokenPrice(tokenAddress);
  return tokenPrice;
}
async function mockFetchTokenPrice(tokenAddress) {
  // Replace this with your own implementation to fetch the token price from an external source
  // This is a mock implementation that returns a dummy token price
  // Example: Fetching token price from a static object based on token address
  const tokenPrices = {
    "0xToken0Address": 10, // Replace with the actual token0 price
    "0xToken1Address": 20, // Replace with the actual token1 price
  };
  return tokenPrices[tokenAddress];
}
async function getPoolAdresses(token0, token1, fees) {
    const factoryContract = new ethers.Contract(UniswapV3FactoryAddress, UniswapV3Factory, provider);
    var count = 0

    for (const fee of fees) {

      const poolAddress = await factoryContract.getPool(token0, token1, fee);

      if (poolAddress != "0x0000000000000000000000000000000000000000") {
        console.log("--- Pool Address ---");
      const token0Contract = new ethers.Contract(token0, Token, provider);
      const token1Contract = new ethers.Contract(token1, Token, provider);
      const token0Symbol = await token0Contract.symbol();
      const token1Symbol = await token1Contract.symbol();

      console.log("Token 0 Symbol:", token0Symbol);
      console.log("Token 1 Symbol:", token1Symbol);

            console.log("Pool Address:", poolAddress);


                const poolContract = new ethers.Contract(poolAddress, UniswapV3Pool, provider);
      const poolFee = await poolContract.fee();
      console.log("Fee:", poolFee);

      console.log("-----------------------");

      const amountIn = ethers.utils.parseEther("1")
      await getPoolInformation(poolAddress)
      const sqrtmod = 0
      await qoute(token0, token1, poolFee, amountIn,sqrtmod,poolAddress)
    //  calculateProfits(poolAddress)
      }

  if (poolAddress == "0x0000000000000000000000000000000000000000"){
  count = count + 1
}



    }
    console.log(`\n-------------${count} Pools are missing-------------------`)

  }
async function main() {
  // Tokens & Fees
  const token0 = "0x4200000000000000000000000000000000000006"; // WETH
  const token1 = "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"; // DAI

  const Amount = ethers.utils.parseEther("1")
  const fees = [500, 10000, 3000];
 //await getWethPrice()

  //await priceImpact(token0,token1,fees[0],Amount)

 getPoolAdresses(token0, token1, fees);
 //qoute(token0, token1, fees[1], amountIn,"0","0x95d9D28606ee55De7667f0F176eBfc3215CFD9C0")

}

 main()
