const Web3 = require('web3');
const HDWalletProvider = require('truffle-hdwallet-provider');
const fs = require('fs');

const mnemonic = fs.readFileSync("../.secret").toString().trim();
const infuraMainnet = fs.readFileSync("../.infura").toString().trim();
const provider = new HDWalletProvider(mnemonic, infuraMainnet);

const web3 = new Web3(provider);

const TRADING_ADDRESS = '0xA540fb50288cc31639305B1675c70763C334953b'; // Address of Trading contract
const HANDLER = '0x73FbC940ACcDc620c0D6E27e1511D06Cd406228b'; // Address of the Token Handler for the Trading contract
const DAI = '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359';
const KYBER = '0x818e6fecd516ecc3849daf6845e3ec868087b755';
const UNISWAP = '0x09cabEC1eAd1c0Ba254B09efb3EE13841712bE14';
const zeroAddress = '0x0000000000000000000000000000000000000000';

const TRADING = require('./abis/DexTrading.js');
const KYBERPROXYABI = require('./abis/KyberNetworkProxy.js');
const UNISWAPABI = require('./abis/Uniswap.js');

const Trading = new web3.eth.Contract(TRADING);
const KyberNetworkProxy = new web3.eth.Contract(KYBERPROXYABI);
const uniswapDai = new web3.eth.Contract(UNISWAPABI);

async function TestKyberSingle(dryRun) {
  try {
    const maxDestAmount = '57896044618658097711785492504343953926634992332820282019728792003956564819968';
    const minConversionRate = '1'; // replace with actual minimum conversion rate
    const hint = web3.utils.utf8ToHex('PERM');
    let data = KyberNetworkProxy.methods.tradeWithHint(DAI,
                                                                 '100000000000000000',
                                                                 '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                                                                 TRADING_ADDRESS,
                                                                 maxDestAmount,
                                                                 minConversionRate,
                                                                 '0x440bbd6a888a36de6e2f6a25f65bc4e16874faa9',
                                                                 hint).encodeABI();

    let offsets = ['0', data.substr(2).length / 2];
    let exchanges = [KYBER];
    let approvals = [zeroAddress];
    // values is 0 if not sending ETH, otherwise is amount of ETH to be sent
    let values = ['0'];
    let tradeData = Trading.methods.trade(DAI, 
                                          '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                                          '1000000000000000000',
                                          exchanges,
                                          approvals,
                                          data,
                                          offsets,
                                          values,
                                          '0' /* this is minTokensAmount, set this to the minimum tokens needed to be received after all trades */,
                                          '0' //trade type
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
    const minConversionRate = '1'; // replace with actual min conversion rate
    let data = uniswapDai.methods.tokenToEthSwapInput('1000000000000000000', 
                                                              minConversionRate, 
                                                             (parseInt(new Date() / 1000) + 60 * 10).toString()).encodeABI(); 

    let offsets = ['0', data.substr(2).length / 2];
    let exchanges = [UNISWAP];

    let approvals = [zeroAddress];
    // values is 0 if not sending ETH, otherwise is amount of ETH to be sent
    let values = ['0'];
    let tradeData = Trading.methods.trade(DAI, 
                                          '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                                          '1000000000000000000',
                                          exchanges,
                                          approvals,
                                          data,
                                          offsets,
                                          values,
                                          '0', /* this is minTokensAmount, this should be minimum tokens needed to be received after all trades */
                                          '0' 
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
    const maxDestAmount = '57896044618658097711785492504343953926634992332820282019728792003956564819968';
    const minConversionRate = '0'; // replace with min conversion rate
    const hint = web3.utils.utf8ToHex('PERM');
    let kyberData = KyberNetworkProxy.methods.tradeWithHint(DAI,
                                                                 '100000000000000000',
                                                                 '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                                                                 TRADING_ADDRESS,
                                                                 maxDestAmount,
                                                                 minConversionRate,
                                                                 '0x440bbd6a888a36de6e2f6a25f65bc4e16874faa9',
                                                                 hint).encodeABI();

    let uniswapData = uniswapDai.methods.tokenToEthSwapInput('1000000000000000000', 
                                                              minConversionRate, 
                                                             (parseInt(new Date() / 1000) + 60 * 10).toString()).encodeABI(); 

    let dataArray = [kyberData.substr(2), uniswapData.substr(2)];                                              
    let exchanges = [KYBER, UNISWAP];
    let approvals = [zeroAddress, zeroAddress];

    let data = '0x';
    let offset = 0;
    let offsets = [offset];
    for (let i = 0; i < dataArray.length; i++) {
      data += dataArray[i];
      offset = dataArray[i].length / 2 + offsets[i];
      offsets.push(offset);
    }
    let values = ['0', '0'];

    let tradeData = Trading.methods.trade(DAI, 
                                          '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                                          '2000000000000000000',
                                          exchanges,
                                          approvals,
                                          data,
                                          offsets,
                                          values,
                                          '0',
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
                                        gasPrice: gasPrice // in production, you will want to get the current gas from ethgasstation.info instead of hardcoding this
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

async function approveHandler() {
    let signature = web3.utils.sha3('approve(address)').substring(0,10);
    let arguments = web3.eth.abi.encodeParameter('address', HANDLER);

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
      await approveHandler(dryRun);
      break;
    case 'kyber':
      console.log('Kyber');
      await TestKyberSingle(dryRun);
      break;
    case 'uniswap':
        console.log('Uniswap');
      await TestUniswapSingle(dryRun);
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