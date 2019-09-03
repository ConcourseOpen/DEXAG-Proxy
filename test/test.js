const Web3 = require('web3');
const HDWalletProvider = require('truffle-hdwallet-provider');
const fs = require('fs');
const request = require('request-promise');

const mnemonic = fs.readFileSync("../.secret").toString().trim();
const infuraMainnet = "https://mainnet.infura.io/v3/db0babc871d74cf79895319a8704666c";
const provider = new HDWalletProvider(mnemonic, infuraMainnet);

const web3 = new Web3(provider);

const TRADING = require('../build/contracts/Trading.json');
const Trading = new web3.eth.Contract(TRADING.abi);

const TRADING_ADDRESS = '';
const SPENDER = '';
const DAI = '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359';
const KYBER = '0x818e6fecd516ecc3849daf6845e3ec868087b755';
const UNISWAP = '0x09cabEC1eAd1c0Ba254B09efb3EE13841712bE14';
const RADAR_ASSET_PROXY = '0x95E6F48254609A6ee006F7D493c8e5fB97094ceF';
const RADAR_RELAY = '0x080bf510FCbF18b91105470639e9561022937712';
const BANCOR = '0x587044b74004e3d5ef2d453b7f8d198d9e4cb558';
const ETH2DAI = '0x793EbBe21607e4F04788F89c7a9b97320773Ec59';
const zeroAddress = '0x0000000000000000000000000000000000000000';

async function TestKyberSingle(dryRun) {
  try {
    var options = {
      uri: 'https://staging-api.dex.ag/trade?from=dai&to=eth&fromAmount=1&dex=kyber',
      json: true // Automatically parses the JSON string in the response
    };
    const dexAgResponse = await request(options);

    let callData = dexAgResponse.trade.data;
    let callDataConcat = callData;

    let starts = ['0', callDataConcat.substr(2).length / 2];
    let callAddresses = [KYBER];
    let approvals = [zeroAddress];
    // values is 0 if not sending ETH, otherwise is amount of ETH to be sent
    let values = ['0'];
    let tradeData = Trading.methods.trade(DAI, 
                                          '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                                          '1000000000000000000',
                                          callAddresses,
                                          approvals,
                                          callDataConcat,
                                          starts,
                                          values,
                                          '0' /* this is minTokensAmount, this should be minimum tokens needed to be received after all trades */ 
                                          ).encodeABI();
      
      console.log(tradeData);
      let gasEstimate = await estimate(TRADING_ADDRESS, tradeData);
      if (!dryRun) {
        await sendTransaction(TRADING_ADDRESS, tradeData, gasEstimate);
      }                                       
  } catch(e) {
      console.log("ERROR: " + e);
  }
}

async function TestRadarRelaySingle(dryRun) {
    try {
      var options = {
        uri: 'https://staging-api.dex.ag/trade?from=dai&to=eth&fromAmount=1&dex=radar-relay',
        json: true // Automatically parses the JSON string in the response
      };
      const dexAgResponse = await request(options);

      let callDataConcat = dexAgResponse.trade.data;

      let starts = ['0', callDataConcat.substr(2).length / 2];
      let callAddresses = [RADAR_RELAY];

      let approvals = [RADAR_ASSET_PROXY];
      // values is 0 if not sending ETH, otherwise is amount of ETH to be sent
      let values = ['0'];
      let tradeData = Trading.methods.trade(DAI, 
                                            '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                                            '1000000000000000000',
                                            callAddresses,
                                            approvals,
                                            callDataConcat,
                                            starts,
                                            values,
                                            '0' /* this is minTokensAmount, this should be minimum tokens needed to be received after all trades */ 
                                            ).encodeABI();
      
      console.log(tradeData);
      let gasEstimate = await estimate(TRADING_ADDRESS, tradeData); 
      if (!dryRun) {
        await sendTransaction(TRADING_ADDRESS, tradeData, gasEstimate);
      }                                           
    } catch(e) {
        console.log("ERROR: " + e);
    }
}

async function TestBancorSingle(dryRun) {
  try {
    var options = {
      uri: 'https://staging-api.dex.ag/trade?from=dai&to=eth&fromAmount=1&dex=bancor',
      json: true // Automatically parses the JSON string in the response
    };
    const dexAgResponse = await request(options);

    let callDataConcat = dexAgResponse.trade.data;
    let gasPrice = dexAgResponse.gasPrice;

    let starts = ['0', callDataConcat.substr(2).length / 2];
    let callAddresses = [BANCOR];

    let approvals = [zeroAddress];
    // values is 0 if not sending ETH, otherwise is amount of ETH to be sent
    let values = ['0'];
    let tradeData = Trading.methods.trade(DAI, 
                                          '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                                          '1000000000000000000',
                                          callAddresses,
                                          approvals,
                                          callDataConcat,
                                          starts,
                                          values,
                                          '0' /* this is minTokensAmount, this should be minimum tokens needed to be received after all trades */ 
                                          ).encodeABI();
    
    console.log(tradeData);
    let gasEstimate = await estimate(TRADING_ADDRESS, tradeData); 
    if (!dryRun) {
      await sendTransaction(TRADING_ADDRESS, tradeData, gasEstimate);
    }                                          
  } catch(e) {
      console.log("ERROR: " + e);
  }
}

async function TestUniswapSingle(dryRun) {
  try {
    var options = {
      uri: 'https://staging-api.dex.ag/trade?from=dai&to=eth&fromAmount=1&dex=uniswap',
      json: true // Automatically parses the JSON string in the response
    };
    const dexAgResponse = await request(options);

    let callDataConcat = dexAgResponse.trade.data;

    let starts = ['0', callDataConcat.substr(2).length / 2];
    let callAddresses = [UNISWAP];

    let approvals = [zeroAddress];
    // values is 0 if not sending ETH, otherwise is amount of ETH to be sent
    let values = ['0'];
    let tradeData = Trading.methods.trade(DAI, 
                                          '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                                          '1000000000000000000',
                                          callAddresses,
                                          approvals,
                                          callDataConcat,
                                          starts,
                                          values,
                                          '0' /* this is minTokensAmount, this should be minimum tokens needed to be received after all trades */ 
                                          ).encodeABI();
    
    console.log(tradeData);
    let gasEstimate = await estimate(TRADING_ADDRESS, tradeData); 
    if (!dryRun) {
      await sendTransaction(TRADING_ADDRESS, tradeData, gasEstimate);
    }                                         
  } catch(e) {
      console.log("ERROR: " + e);
  }
}

async function TestEth2DaiSingle(dryRun) {
  try {
    var options = {
      uri: 'https://staging-api.dex.ag/trade?from=dai&to=eth&fromAmount=1&dex=oasis',
      json: true // Automatically parses the JSON string in the response
    };
    const dexAgResponse = await request(options);

    let callDataConcat = dexAgResponse.trade.data;

    let starts = ['0', callDataConcat.substr(2).length / 2];
    let callAddresses = [ETH2DAI];

    let approvals = [zeroAddress];
    // values is 0 if not sending ETH, otherwise is amount of ETH to be sent
    let values = ['0'];
    let tradeData = Trading.methods.trade(DAI, 
                                          '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                                          '1000000000000000000',
                                          callAddresses,
                                          approvals,
                                          callDataConcat,
                                          starts,
                                          values,
                                          '0' /* this is minTokensAmount, this should be minimum tokens needed to be received after all trades */ 
                                          ).encodeABI();
    
    console.log(tradeData);
    let gasEstimate = await estimate(TRADING_ADDRESS, tradeData); 
    if (!dryRun) {
      await sendTransaction(TRADING_ADDRESS, tradeData, gasEstimate);
    }                                         
  } catch(e) {
      console.log("ERROR: " + e);
  }
}

async function TestMulti(dryRun) {
  try {
    let options = {
      uri: 'https://staging-api.dex.ag/trade?from=dai&to=eth&fromAmount=1&dex=kyber',
      json: true // Automatically parses the JSON string in the response
    };
    let dexAgResponse = await request(options);
    let kyberData = dexAgResponse.trade.data;

    options = {
      uri: 'https://staging-api.dex.ag/trade?from=dai&to=eth&fromAmount=1&dex=uniswap',
      json: true // Automatically parses the JSON string in the response
    };
    dexAgResponse = await request(options);

    let uniswapData = dexAgResponse.trade.data;

    let callDataArray = [kyberData.substr(2), uniswapData.substr(2)];                                              
    let callAddresses = [KYBER, UNISWAP];
    let approvals = [zeroAddress, zeroAddress];

    let callDataConcat = '0x';
    let start = 0;
    let starts = [start];
    for (let i = 0; i < callDataArray.length; i++) {
      callDataConcat += callDataArray[i];
      start = callDataArray[i].length / 2 + starts[i];
      starts.push(start);
    }
    let values = ['0', '0'];

    let tradeData = Trading.methods.trade(DAI, 
                                          '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                                          '2000000000000000000',
                                          callAddresses,
                                          approvals,
                                          callDataConcat,
                                          starts,
                                          values,
                                          '0' ).encodeABI();
    
    console.log(tradeData);
    let gasEstimate = await estimate(TRADING_ADDRESS, tradeData);
    if (!dryRun) {
      await sendTransaction(TRADING_ADDRESS, tradeData, gasEstimate);
    }                                    
  } catch(e) {
      console.log("ERROR: " + e);
  }
}

function sendTransaction(address, data, gasEstimate, gasPrice=web3.utils.toWei('4', 'gwei')) {
    return new Promise(async (resolve, reject) => {
        try {
            web3.eth.getAccounts().then((accounts) => {
                web3.eth.sendTransaction({from: accounts[0], 
                                        to: address,
                                        data: data,
                                        gas: gasEstimate,
                                        gasPrice: gasPrice
                                        })
                                        .on('transactionHash', function(hash){
                                          console.log('TX: ' + hash);
                                        })
                                        .on('confirmation', function(confirmationNumber, receipt) { 
                                          console.log(confirmationNumber + ' confirmation');
                                          console.log(receipt);
                                          resolve();
                                        })
            })
        } catch (e) {
            reject(e)
        }
    })
}

function estimate(address, data) {
  return new Promise(async (resolve, reject) => {
    web3.eth.getAccounts().then((accounts) => {
      web3.eth.estimateGas({
        to: address,
        from: accounts[0],
        data: data
      })
      .then((gasEstimate) => {
        console.log(gasEstimate);
        resolve(gasEstimate);
      });
    })
  });
}

async function approveSpender() {
    let signature = web3.utils.sha3('approve(address)').substring(0,10);
    let arguments = web3.eth.abi.encodeParameter('address', SPENDER);

    let data = signature + arguments.substr(2);

    await sendTransaction(DAI, data);
}

async function Test() {
  let option = process.argv[2];
  let dryRun = false;
  if (process.argv[3] == 'dry') {
    dryRun = true;
  }
  switch (option) {
    case 'approve':
      console.log('Approve');
      await approveSpender(dryRun);
      break;
    case 'kyber':
      console.log('Kyber');
      await TestKyberSingle(dryRun);
      break;
    case 'radar':
        console.log('Radar Relay');
      await TestRadarRelaySingle(dryRun);
      break;
    case 'bancor':
        console.log('Bancor');
      await TestBancorSingle(dryRun);
      break;
    case 'uniswap':
        console.log('Uniswap');
      await TestUniswapSingle(dryRun);
      break;
    case 'eth2dai':
        console.log('Eth2Dai');
      await TestEth2DaiSingle(dryRun);
      break;
    case 'multi':
        console.log('Multi Trade');
      await TestMulti(dryRun);
      break;
    default:
      console.log('No Selection');
      break;
  }

  process.exit();
}

Test();
