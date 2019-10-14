pragma solidity ^0.5.10;
pragma experimental ABIEncoderV2;

import './Ownable.sol';
import './SafeMath.sol';
import './IERC20.sol';
import './SafeERC20.sol';

contract IWETH is IERC20 {
    function withdraw(uint256 amount) external;
}

contract ApprovalHandler is Ownable {

    using SafeERC20 for IERC20;

    function transferFrom(IERC20 erc, address sender, address receiver, uint256 numTokens) external onlyOwner {
        erc.safeTransferFrom(sender, receiver, numTokens);
    }
}

contract DexTrading is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    ApprovalHandler public approvalHandler;

    event Trade(address indexed from, address indexed to, uint256 toAmount, address indexed trader, address[] exchanges, uint256 tradeType);

    IWETH public WETH = IWETH(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    constructor() public {
        approvalHandler = new ApprovalHandler();
    }

    function trade(
        IERC20 from,
        IERC20 to,
        uint256 fromAmount,
        address[] memory exchanges,
        address[] memory approvals,
        bytes memory data,
        uint256[] memory offsets,
        uint256[] memory etherValues,
        uint256 limitAmount,
        uint256 tradeType
    ) public payable {
        require(exchanges.length > 0, 'No Exchanges');

        // if from is an ERC20, pull tokens from msg.sender
        if (address(from) != 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            approvalHandler.transferFrom(from, msg.sender, address(this), fromAmount);
        }

        // execute trades on dexes
        executeTrades(from, exchanges, approvals, data, offsets, etherValues);

        // check how many tokens were received after trade execution
        uint256 tradeReturn = viewBalance(to, address(this));
        require(tradeReturn >= limitAmount, 'Trade returned less than the minimum amount');

        // return any unspent funds
        uint256 leftover = viewBalance(from, address(this));
        if (leftover > 0) {
            sendFunds(from, msg.sender, leftover);
        }

        sendFunds(to, msg.sender, tradeReturn);

        emit Trade(address(from), address(to), tradeReturn, msg.sender, exchanges, tradeType);
    }

    function executeTrades(
        IERC20 from,
        address[] memory exchanges,
        address[] memory approvals,
        bytes memory data,
        uint256[] memory offsets,
        uint256[] memory etherValues) internal {
            for (uint i = 0; i < exchanges.length; i++) {
                // prevent calling the approvalHandler and check that exchange is a valid contract address
                require(exchanges[i] != address(approvalHandler) && isContract(exchanges[i]), 'Invalid Address');
                if (approvals[i] != address(0)) {
                    // handle approval if the aprovee is not the exchange address
                    approve(from, approvals[i]);
                } else {
                    // handle approval if the approvee is the exchange address
                    approve(from, exchanges[i]);
                }
                // do trade
                require(external_call(exchanges[i], etherValues[i], offsets[i], offsets[i + 1] - offsets[i], data), 'External Call Failed');
            }
        }

    // ERC20 Utility Functions

    function approve(IERC20 erc, address approvee) internal {
        if (
            address(erc) != 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE &&
            erc.allowance(address(this), approvee) == 0
        ) {
            erc.safeApprove(approvee, uint256(-1));
        }
    }

    function viewBalance(IERC20 erc, address owner) internal view returns(uint256) {
        if (address(erc) == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            return owner.balance;
        } else {
            return erc.balanceOf(owner);
        }
    }

    function sendFunds(IERC20 erc, address payable receiver, uint256 funds) internal {
        if (address(erc) == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            receiver.transfer(funds);
        } else {
            erc.safeTransfer(receiver, funds);
        }
    }

    // Source: https://github.com/gnosis/MultiSigWallet/blob/master/contracts/MultiSigWallet.sol
    // call has been separated into its own function in order to take advantage
    // of the Solidity's code generator to produce a loop that copies tx.data into memory.
    function external_call(address destination, uint value, uint dataOffset, uint dataLength, bytes memory data) internal returns (bool) {
        bool result;
        assembly {
            let x := mload(0x40)   // "Allocate" memory for output (0x40 is where "free memory" pointer is stored by convention)
            let d := add(data, 32) // First 32 bytes are the padded length of data, so exclude that
            result := call(
                sub(gas, 34710),   // 34710 is the value that solidity is currently emitting
                                   // It includes callGas (700) + callVeryLow (3, to pay for SUB) + callValueTransferGas (9000) +
                                   // callNewAccountGas (25000, in case the destination address does not exist and needs creating)
                destination,
                value,
                add(d, dataOffset),
                dataLength,        // Size of the input (in bytes) - this is what fixes the padding problem
                x,
                0                  // Output is ignored, therefore the output size is zero
            )
        }
        return result;
    }

    /**
     * @dev Returns true if `account` is a contract.
     *
     * This test is non-exhaustive, and there may be false-negatives: during the
     * execution of a contract's constructor, its address will be reported as
     * not containing a contract.
     *
     * > It is unsafe to assume that an address for which this function returns
     * false is an externally-owned account (EOA) and not a contract.
     */
    function isContract(address account) internal view returns (bool) {
        // This method relies in extcodesize, which returns 0 for contracts in
        // construction, since the code is only stored at the end of the
        // constructor execution.
        
        // According to EIP-1052, 0x0 is the value returned for not-yet created accounts
        // and 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470 is returned
        // for accounts without code, i.e. `keccak256('')`
        bytes32 codehash;
        bytes32 accountHash = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;
        // solhint-disable-next-line no-inline-assembly
        assembly { codehash := extcodehash(account) }
        return (codehash != 0x0 && codehash != accountHash);
    }

    function withdrawWeth() external {
        uint256 amount = WETH.balanceOf(address(this));
        WETH.withdraw(amount);
    }

    function () external payable {
        require(msg.sender != tx.origin);
    }
}