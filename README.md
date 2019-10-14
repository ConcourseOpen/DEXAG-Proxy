## To Install

Run `npm install`

## To Test

First add a `.secret` file containing your 12 word mnemonic phrase to the root of the directory. This will be the account that does the transactions.

Inside `test.js` in the test folder, change the TRADING_ADDRESS variable and SPENDER to the contract you wish to test and the contract's TokenSpender contract.
If it is your first time using the contract, inside the test folder you'll need to run `node test.js approve` to approve your DAI tokens for trading.


Then, again inside the test folder run `node test.js exchange` where exchange is the DEX you want to test. This will test a 1 DAI-ETH trade on the DEX. You can add a dry option to see the CallData along with the gas price if the transaction would be succesful  without actually sending the transaction (`node test.js kyber dry`).


Exchange options:

  `kyber`
  
  `uniswap`
  
  `radar`
  
  `eth2dai`
  
  `bancor`
  
  `multi` (tests a 2 DAI-ETH multi dex trade between Uniswap and Kyber, 1 DAI on each DEX)
