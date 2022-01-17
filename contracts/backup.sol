//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

interface IBEP20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract backup is
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    string public constant name = "EINSTEIN-Yield-Farming";

    // Info of each pool.
    struct PoolInfo {
        IBEP20 lpToken; // Address of LP token contract.
        IBEP20 rewardToken; // Address of Reward token contract.
        uint256 rewardRate; // Reward rate.
        uint256 rewardInterval; // Interval to calculate reward.
        uint256 startBlock; // Block number after which reward should start
        uint256 lockPeriod; // Farming lock period
        uint256 endTime; // Block number after which reward should stop
        uint256 totalFarmedAmount; // Total farmed amount
    }

    // Info of each user.
    struct UserInfo {
        uint256 farmedAmount; // How many LP tokens the user has provided.
        uint256 farmingStartTime; // Block number when the user farms
        bool hasFarmed;
        bool isFarming;
        uint256 oldReward;
    }

    // Info of each pool.
    mapping(IBEP20 => PoolInfo) public poolInfo;
    // Info of each user that farms LP tokens.
    mapping(address => mapping(IBEP20 => UserInfo)) public userInfo;
    uint256 public timeBound; //72 hours in seconds
    mapping(address => mapping(IBEP20 => uint256)) public userTimeBounds; //useraddress => lpTokenAddress => timestamprequested

    event Reward(address indexed from, address indexed to, uint256 amount);
    event FarmedToken(address indexed from, address indexed to, uint256 amount);
    event RemoveFarmedToken(
        address indexed from,
        address indexed to,
        uint256 amount
    );
    event WithdrawFromFarmedBalance(address indexed user, uint256 amount);
    event ExternalTokenTransferred(
        address indexed from,
        address indexed to,
        uint256 amount
    );
    event UpdatedRewardRate(IBEP20 lpToken, uint256 rewardRate);
    event UpdatedRewardToken(IBEP20 lpToken, IBEP20 rewardToken);
    event UpdatedRewardInterval(IBEP20 lpToken, uint256 rewardInterval);
    event UpdatedendTime(IBEP20 lpToken, uint256 endTime);
    event UpdatedLockPeriod(IBEP20 lpToken, uint256 lockPeriod);
    event withdrawRequested(address indexed to, IBEP20 lptoken);
    event TimeBoundChanged(uint256 newTimeBound);

    function initialize() public virtual initializer {
        timeBound = 259200; //72 hours in seconds
        // initializing
        __Pausable_init();
        __Ownable_init_unchained();
        __ReentrancyGuard_init_unchained();
    }

    //	constructor() {}

    // Add a new lp to the pool. Can only be called by the owner.
    // XXX DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    function addPool(
        IBEP20 _lpToken,
        IBEP20 _rewardToken,
        uint256 _rewardRate,
        uint256 _rewardIntervalInSeconds,
        uint256 _startBlock,
        uint256 _lockPeriodInSeconds,
        uint256 _endTime,
        uint256 _totalFarmedAmount
    ) external onlyOwner {
        poolInfo[_lpToken] = PoolInfo({
            lpToken: _lpToken,
            rewardToken: _rewardToken,
            rewardRate: _rewardRate,
            rewardInterval: _rewardIntervalInSeconds,
            startBlock: _startBlock,
            lockPeriod: _lockPeriodInSeconds,
            endTime: _endTime,
            totalFarmedAmount: _totalFarmedAmount
        });
    }

    // Farm Tokens (Deposit): An investor will deposit the lpToken into the smart contracts to starting earning rewards.
    // Core Thing: Transfer the lpToken from the investor's wallet to this smart contract.

    function farmTokensForReward(IBEP20 lpToken, uint256 _amount)
        external
        virtual
        nonReentrant
        whenNotPaused
    {
        require(
            block.number >= poolInfo[lpToken].startBlock,
            "Farming: Start Reward Block has not reached"
        );
        if (poolInfo[lpToken].endTime > 0)
            require(
                block.timestamp <= poolInfo[lpToken].endTime,
                "Farming: Has ended"
            );
        require(_amount > 0, "Farming: Balance cannot be 0"); // Farming amount cannot be zero
        require(
            lpToken.balanceOf(msg.sender) >= _amount,
            "Farming: Insufficient token balance"
        ); // Checking msg.sender balance

        if (userInfo[msg.sender][lpToken].isFarming) {
            require(
                (block.timestamp -
                    userInfo[msg.sender][lpToken].farmingStartTime) >=
                    poolInfo[lpToken].lockPeriod,
                "Farming is locked"
            );
            uint256 oldReward = calculateReward(lpToken, msg.sender);
            userInfo[msg.sender][lpToken].oldReward += oldReward;
        }

        bool transferStatus = lpToken.transferFrom(
            msg.sender,
            address(this),
            _amount
        );
        if (transferStatus) {
            emit FarmedToken(msg.sender, address(this), _amount);
            userInfo[msg.sender][lpToken].farmedAmount += _amount; // update user farming balance
            userInfo[msg.sender][lpToken].farmingStartTime = block.timestamp; // save the time when they started farming
            // update farming status
            userInfo[msg.sender][lpToken].isFarming = true;
            userInfo[msg.sender][lpToken].hasFarmed = true;
            poolInfo[lpToken].totalFarmedAmount += _amount;
        }
    }

    // Returns the reward of the caller
    function calculateReward(IBEP20 lpToken, address _rewardAddress)
        public
        view
        returns (uint256)
    {
        uint256 balances = userInfo[_rewardAddress][lpToken].farmedAmount /
            10**18;
        uint256 rewards = 0;
        uint256 timeDifferences;
        if (balances > 0) {
            if (poolInfo[lpToken].endTime > 0) {
                if (block.timestamp > poolInfo[lpToken].endTime) {
                    timeDifferences =
                        poolInfo[lpToken].endTime -
                        userInfo[_rewardAddress][lpToken].farmingStartTime;
                } else {
                    timeDifferences =
                        block.timestamp -
                        userInfo[_rewardAddress][lpToken].farmingStartTime;
                }
            } else {
                timeDifferences =
                    block.timestamp -
                    userInfo[_rewardAddress][lpToken].farmingStartTime;
            }

            // reward calculation
            uint256 timeFactor = timeDifferences / 60 / 60 / 24 / 7;
            uint256 apyFactorInWei = (poolInfo[lpToken].rewardRate *
                timeFactor) / 52;
            rewards = ((((((balances * 100) /
                (poolInfo[lpToken].totalFarmedAmount / 10**18)) * (10**18)) +
                (timeFactor * (10**18)) +
                apyFactorInWei) * balances) / 100);
        }
        return rewards;
    }

    function withdrawFarmedTokens(IBEP20 lpToken)
        external
        virtual
        nonReentrant
        whenNotPaused
    {
        require(
            userInfo[msg.sender][lpToken].isFarming,
            "Farming: No farmed balance available"
        );
        require(
            (block.timestamp -
                userInfo[msg.sender][lpToken].farmingStartTime) >=
                poolInfo[lpToken].lockPeriod,
            "Farming: Is in lock period"
        );
        require(
            userTimeBounds[msg.sender][lpToken] > 0,
            "Request withdraw before performing withdraw"
        );
        require(
            block.timestamp >= userTimeBounds[msg.sender][lpToken] + timeBound,
            "Cannot perform withdraw before the time bound"
        );

        uint256 balance = userInfo[msg.sender][lpToken].farmedAmount;
        uint256 reward = calculateReward(lpToken, msg.sender) +
            userInfo[msg.sender][lpToken].oldReward;

        // send farmed tokens
        removeFarmedTokens(lpToken, balance);
        // send reward
        sendRewardTokens(lpToken, reward);
        userTimeBounds[msg.sender][lpToken] = 0;
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(IBEP20 lpToken)
        external
        nonReentrant
        whenNotPaused
    {
        require(
            userInfo[msg.sender][lpToken].isFarming,
            "Farming: No farmed balance available"
        );
        require(
            userTimeBounds[msg.sender][lpToken] > 0,
            "Request withdraw before performing withdraw"
        );
        require(
            block.timestamp >= userTimeBounds[msg.sender][lpToken] + timeBound,
            "Cannot perform withdraw before the time bound"
        );
        uint256 balance = userInfo[msg.sender][lpToken].farmedAmount;
        require(balance > 0, "Farming: Farmed balance is 0");
        require(
            lpToken.balanceOf(address(this)) >= balance,
            "Farming: Not enough lp token balance"
        );
        // send farmed tokens
        removeFarmedTokens(lpToken, balance);
        userTimeBounds[msg.sender][lpToken] = 0;
    }

    function sendRewardTokens(IBEP20 lpToken, uint256 calculatedReward)
        internal
        virtual
    {
        require(
            poolInfo[lpToken].rewardToken.balanceOf(address(this)) >=
                calculatedReward,
            "Farming: Not enough reward balance"
        );

        if (calculatedReward > 0) {
            bool transferStatus = poolInfo[lpToken].rewardToken.transfer(
                msg.sender,
                calculatedReward
            );
            require(transferStatus, "Farming: Transfer Failed");
            userInfo[msg.sender][lpToken].oldReward = 0;
            emit Reward(address(this), msg.sender, calculatedReward);
        }
    }

    function removeFarmedTokens(IBEP20 lpToken, uint256 balance)
        internal
        virtual
    {
        require(balance > 0, "Farming: Farmed balance is 0");
        require(
            lpToken.balanceOf(address(this)) >= balance,
            "Farming: Not enough lp token balance"
        );

        // remove farmed tokens
        bool transferStatus = lpToken.transfer(msg.sender, balance);
        if (transferStatus) {
            emit RemoveFarmedToken(address(this), msg.sender, balance);
            userInfo[msg.sender][lpToken].farmedAmount = 0; // reset staking balance
            userInfo[msg.sender][lpToken].isFarming = false; // update staking status and stakingStartTime (restore to zero)
            userInfo[msg.sender][lpToken].farmingStartTime = 0;
            userInfo[msg.sender][lpToken].oldReward = 0;
        }
    }

    // withdraw bep20 tokens in contract address
    function withdrawBEP20Token(address _tokenContract, uint256 _amount)
        external
        virtual
        onlyOwner
    {
        require(_tokenContract != address(0), "Address cant be zero address"); // 0 address validation
        require(_amount > 0, "Amount cannot be 0"); // require amount greater than 0
        IBEP20 tokenContract = IBEP20(_tokenContract);
        require(
            tokenContract.balanceOf(address(this)) > _amount,
            "Amount exceeds the balance"
        );
        bool transferStatus = tokenContract.transfer(msg.sender, _amount);
        require(transferStatus, "Transfer Failed");
        emit ExternalTokenTransferred(_tokenContract, msg.sender, _amount);
    }

    // set reward rate for pool in weiAmount
    function setRewardRate(IBEP20 lpToken, uint256 _rewardRate)
        external
        virtual
        onlyOwner
        whenNotPaused
    {
        poolInfo[lpToken].rewardRate = _rewardRate;
        emit UpdatedRewardRate(lpToken, _rewardRate);
    }

    // set reward token address
    function setRewardToken(IBEP20 lpToken, IBEP20 _rewardToken)
        external
        virtual
        onlyOwner
        whenNotPaused
    {
        poolInfo[lpToken].rewardToken = _rewardToken;
        emit UpdatedRewardToken(lpToken, _rewardToken);
    }

    // set reward interval
    function setRewardInterval(IBEP20 lpToken, uint256 _rewardInterval)
        external
        virtual
        onlyOwner
        whenNotPaused
    {
        poolInfo[lpToken].rewardInterval = _rewardInterval;
        emit UpdatedRewardInterval(lpToken, _rewardInterval);
    }

    // set end block
    function setEndTime(IBEP20 lpToken, uint256 _endTime)
        external
        virtual
        onlyOwner
        whenNotPaused
    {
        poolInfo[lpToken].endTime = _endTime;
        emit UpdatedendTime(lpToken, _endTime);
    }

    // set lock period
    function setLockPeriod(IBEP20 lpToken, uint256 _lockPeriodInSeconds)
        external
        virtual
        onlyOwner
        whenNotPaused
    {
        poolInfo[lpToken].lockPeriod = _lockPeriodInSeconds;
        emit UpdatedLockPeriod(lpToken, _lockPeriodInSeconds);
    }

    function requestWithdraw(IBEP20 _lpToken) external virtual whenNotPaused {
        require(poolInfo[_lpToken].lpToken == _lpToken, "No Such pool found");
        userTimeBounds[msg.sender][_lpToken] = block.timestamp;
        emit withdrawRequested(msg.sender, _lpToken);
    }

    function setTimeBound(uint256 _newTimeBound)
        external
        virtual
        onlyOwner
        whenNotPaused
    {
        timeBound = _newTimeBound;
        emit TimeBoundChanged(timeBound);
    }
}
