pragma solidity ^0.5.10;
pragma experimental ABIEncoderV2;

import './Ownable.sol';
import './SafeMath.sol';
import './IERC20.sol';
import './SafeERC20.sol';
import './Callable.sol';

contract IWETH is IERC20 {
    function withdraw(uint256 amount) external;
}

contract ApprovalHandler is Ownable {

    using SafeERC20 for IERC20;

    function transferFrom(IERC20 erc, address sender, address receiver, uint256 numTokens) external onlyOwner {
        erc.safeTransferFrom(sender, receiver, numTokens);
    }
}

contract DexTradingWithCollection is Ownable, Callable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    ApprovalHandler public approvalHandler;

    event Trade(address indexed from, address indexed to, uint256 toAmount, address indexed trader, address[] exchanges, uint256 tradeType);
    event BasisPointsSet(uint256 indexed newBasisPoints);
    event BeneficiarySet(address indexed newBeneficiary);
    event DexagSet(address indexed newDexag);

    IWETH public WETH = IWETH(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    address payable beneficiary;
    address payable dexag;
    uint256 public basisPoints;

    constructor(address payable _beneficiary, address payable _dexag, uint256 _basisPoints) public {
        approvalHandler = new ApprovalHandler();
        beneficiary = _beneficiary;
        dexag = _dexag;
        basisPoints = _basisPoints;
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
        require(exchanges.length == approvals.length, 'Every exchange must have an approval');
        require(limitAmount > 0, 'Limit Amount must be set');

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

        sendCollectionAmount(to, tradeReturn);
        sendFunds(to, msg.sender, viewBalance(to, address(this)));

        emit Trade(address(from), address(to), tradeReturn, msg.sender, exchanges, tradeType);
    }

    function tradeAndSend(
        IERC20 from,
        IERC20 to,
        address payable recipient,
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
        require(exchanges.length == approvals.length, 'Every exchange must have an approval');
        require(limitAmount > 0, 'Limit Amount must be set');
        require(recipient != address(0), 'Must set a recipient');

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

        sendCollectionAmount(to, tradeReturn);
        sendFunds(to, recipient, viewBalance(to, address(this)));

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

    // Send collection amounts

    function sendCollectionAmount(IERC20 erc, uint256 tradeReturn) internal {
        uint256 collectionAmount = tradeReturn.mul(basisPoints).div(10000);
        uint256 platformFee = collectionAmount.mul(4).div(5);

        sendFunds(erc, beneficiary, platformFee);
        sendFunds(erc, dexag, collectionAmount.sub(platformFee));
    }

    // Contract Settings

    function setbasisPoints(uint256 _basisPoints) external onlyOwner {
        basisPoints = _basisPoints;
        emit BasisPointsSet(basisPoints);
    }

    function setBeneficiary(address payable _beneficiary) external onlyOwner {
        require(_beneficiary != address(0));
        beneficiary = _beneficiary;
        emit BeneficiarySet(_beneficiary);
    }

    function setDexag(address payable _dexag) external {
        require(msg.sender == address(dexag));
        require(_dexag != address(0));
        dexag = _dexag;
        emit DexagSet(dexag);
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