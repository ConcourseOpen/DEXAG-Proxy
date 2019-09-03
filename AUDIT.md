# DEXAG Proxy Audit
De'on Summers (github)[https://github.com/dsummers91)

## Scope

### Trading.sol
Trading.sol contains the logic to send trade requests. The current tests allows Kyber, Uniswap, Radar_Relay, and Bancor. A user would request a trade from Dex.ag, then the endpoint would populate data for the trading call that the user would execute in order to get the best price for a specific token trade.

The tokens are initially transfered to the Trading contract, then fees are token, and trade is sent to a specific DEX with the user receiving their requested token

#### Out of scope
The results from DEX API endpoint []

Since these results are dynamic from a central entity it is inferred that the data from this call are trusted. Steps should be taken to make sure this data will never be malicious.

## Vulnerabilities

### Precision Error in Trade Function


When calcuting the fees to send to beneficiary and proveq the contract states

```
_transfer(toToken, beneficiary, feeAmount.mul(4).div(5), false);
_transfer(toToken, proveq, feeAmount.div(5), false);
```


The could result in a very small number of tokens being left over if the token amount is not divisible by 5. at most it would leave 4-e18 ether/tokens. But to be certain there are no tokens leftover I would recommend using calculating the fee for one entity, then using substraction to calclate whatever is leftover.

### Problems with external call

The external call method has safety concerns that should be addresses:
Some safety concerns are:

#### Black Box
The user is unable to know for sure what the results of the call may do, since hex calldata is sent to the contract
#### Infinite Approvals
In order to interact with the contract users must approve an infinate amount of tokens for each token that will be traded (0 - 1 which equates to 2^256-1)
#### Possible reentrancy
The calldata approves enough gas for a possible contract re-entrancy. But there is no  malicious activity that could be done 


## Recommended Updates

### Whitelist Contracts
Whitelisting contracts would give increased security to the contract. With variable external data, and infinite token approval given to the contract, a malicious contract would be able to transfer all of a users token to their wallet, whilst only giving the user the minimum tokens requested for the trade. 

A contract could implement something as shown:
```
function malicious call(uint256 mintokensAmount, uint256 tokensAmount, IERC20 fromToken, IERC20 toToken, address from, :/) {
  let tokensToSteal = tokensAmount
  fromToken.transferFrom(msg.sender, address(this), tokensAmount)
  msg.sender.transfer(toToken, minTokensAmount)
)
```

The only amount at risk would be the value difference between tokensAmount

### Sign Transactions and utilize ecrecover
In the past there has been clever attacks of cross-site scriptings or other forms of potential hacks, that a malicious actor can change certain information without the user knowing. In such instance, a malicious actor could send harmfull calldata to the transfer function, resulting in user losing their funds. In order to combat thing, it is recommended to sign  (ECDSA signature) a hash of the calldata with a secure private key - in web3 this function is [web3.eth.sign], then within the contract it would verify that the signature using ecrecover, that the owned private key signed that data.


