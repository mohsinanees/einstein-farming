//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

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

contract EinsteinFarming is Ownable, Pausable, ReentrancyGuard {
    using SafeMath for uint256;
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

    // Upgrade state variables.
    mapping(address => mapping(IBEP20 => uint256[])) public farmedBalances; //useraddress => lpTokenAddress => multiple times farmed amounts
    mapping(address => mapping(IBEP20 => uint256[])) public farmingTimestamps; //useraddress => lpTokenAddress => multiple times user farmed
    mapping(address => mapping(IBEP20 => uint256)) public userFarmCount; //useraddress => lpTokenAddress => number of times user farmed
    mapping(address => mapping(IBEP20 => uint256)) public claimedReward; //useraddress => lpTokenAddress => Accumalated reward for user that will be subtracted everytime user claims reward

    event Reward(address indexed from, address indexed to, uint256 amount);
    event FarmedToken(address indexed from, address indexed to, uint256 amount);
    event RemoveFarmedToken(
        address indexed from,
        address indexed to,
        uint256 amount
    );
    event WithdrawFromFarmedBalance(
        address indexed user,
        IBEP20 lpToken,
        uint256 amount
    );
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

    // function initialize() public virtual initializer {
    //     timeBound = 259200; //72 hours in seconds
    //     // initializing
    //     __Pausable_init();
    //     __Ownable_init_unchained();
    //     __ReentrancyGuard_init_unchained();
    // }

    constructor() {
        IBEP20 lpToken = IBEP20(0xf7faC3522eC142ef549ACB39B4c9D4F29b96f7e6);
        addPool(
            IBEP20(0xf7faC3522eC142ef549ACB39B4c9D4F29b96f7e6),
            IBEP20(0xf7faC3522eC142ef549ACB39B4c9D4F29b96f7e6),
            60000000000000000000,
            30,
            block.number,
            15,
            block.number + 100000,
            0
        );

        address[3] memory users = [
            0xa6510E349be7786200AC9eDC6443D09FE486Cb40,
            0xbCC2d6fD76c84Ca240321E87AF74Aa159B155E93,
            0x674EB6965EAb2B66571966b56f9747698E9AD9d0
        ];
        uint256[3] memory amounts = [
            uint256(100) * 10**18,
            uint256(200) * 10**18,
            uint256(300) * 10**18
        ];
        for (uint256 i = 0; i < users.length; i++) {
            farmedBalances[users[i]][lpToken].push(amounts[i]); // update user staking balance
            farmingTimestamps[users[i]][lpToken].push(block.timestamp); // update user staking start time for this stake amount
            userInfo[users[i]][lpToken].farmedAmount += amounts[i]; // update user staked balance
            userFarmCount[users[i]][lpToken]++; // increment user stake count
            poolInfo[lpToken].totalFarmedAmount += amounts[i]; // update Contract Staking balance
            userInfo[users[i]][lpToken].farmingStartTime = block.timestamp; // save the time when they started staking
            // update staking status
            userInfo[users[i]][lpToken].isFarming = true;
            userInfo[users[i]][lpToken].hasFarmed = true;
        }
    }

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
    ) public onlyOwner {
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
            // uint256 oldReward = calculateReward(lpToken, msg.sender);
            // userInfo[msg.sender][lpToken].oldReward += oldReward;
        }

        bool transferStatus = lpToken.transferFrom(
            msg.sender,
            address(this),
            _amount
        );
        if (transferStatus) {
            emit FarmedToken(msg.sender, address(this), _amount);

            // Upgrade state variables.
            farmedBalances[msg.sender][lpToken].push(_amount);
            farmingTimestamps[msg.sender][lpToken].push(block.timestamp);
            userFarmCount[msg.sender][lpToken]++;

            userInfo[msg.sender][lpToken].farmedAmount += _amount; // update user farming balance
            userInfo[msg.sender][lpToken].farmingStartTime = block.timestamp; // save the time when they started farming
            // update farming status
            userInfo[msg.sender][lpToken].isFarming = true;
            userInfo[msg.sender][lpToken].hasFarmed = true;
            poolInfo[lpToken].totalFarmedAmount += _amount;
        }
    }

    function withdrawFarmedTokens(IBEP20 lpToken, uint256 _amount)
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
            userInfo[msg.sender][lpToken].farmedAmount > 0,
            "Farming: Farmed balance is 0"
        );
        uint256 balance = userInfo[msg.sender][lpToken].farmedAmount;
        require(
            lpToken.balanceOf(address(this)) >= balance,
            "Farming: Not enough lp token balance"
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
            "Cannot perform withdraw within the unbound time"
        );
        // Check the old reward amount
        uint256 reward = calculateReward(msg.sender, lpToken);

        if (_amount == userInfo[msg.sender][lpToken].farmedAmount) {
            bool status = sendRewardTokens(lpToken, reward); // Checks if the contract has enough tokens to reward or not
            require(status, "FARMING: Reward transfer failed");
            removeFarmedTokens(lpToken);
        } else {
            if (
                reward > 0 &&
                reward <= poolInfo[lpToken].rewardToken.balanceOf(address(this))
            ) {
                userInfo[msg.sender][lpToken].oldReward =
                    userInfo[msg.sender][lpToken].oldReward +
                    reward;
            }

            // Modify balances
            uint256 remainingAmount = _amount;
            uint256 balancesLength = farmedBalances[msg.sender][lpToken].length;
            for (uint256 i = balancesLength - 1; i < balancesLength; i--) {
                if (farmedBalances[msg.sender][lpToken][i] > 0) {
                    if (
                        remainingAmount < farmedBalances[msg.sender][lpToken][i]
                    ) {
                        farmedBalances[msg.sender][lpToken][
                            i
                        ] -= remainingAmount;
                        break;
                    } else {
                        remainingAmount =
                            remainingAmount -
                            farmedBalances[msg.sender][lpToken][i];
                        farmedBalances[msg.sender][lpToken][i] = 0;
                        farmingTimestamps[msg.sender][lpToken][i] = 0;
                        userFarmCount[msg.sender][lpToken]--;
                    }
                }
            }
            userInfo[msg.sender][lpToken].farmedAmount = userInfo[msg.sender][
                lpToken
            ].farmedAmount.sub(_amount);
            emit WithdrawFromFarmedBalance(msg.sender, lpToken, _amount);
        }

        bool transferStatus = lpToken.transferFrom(
            msg.sender,
            address(this),
            _amount
        );
        require(transferStatus, "FARMING: Transfer Failed");
        poolInfo[lpToken].totalFarmedAmount -= _amount;
        userTimeBounds[msg.sender][lpToken] = 0;
    }

    function removeFarmedTokens(IBEP20 lpToken) internal virtual {
        uint256 balance = userInfo[msg.sender][lpToken].farmedAmount;
        // remove farmed tokens
        bool transferStatus = lpToken.transfer(msg.sender, balance);
        if (transferStatus) {
            userInfo[msg.sender][lpToken].farmedAmount = 0; // reset staking balance
            userInfo[msg.sender][lpToken].isFarming = false; // update staking status and stakingStartTime (restore to zero)
            userInfo[msg.sender][lpToken].farmingStartTime = 0;
            userInfo[msg.sender][lpToken].oldReward = 0;
            for (
                uint256 i = 0;
                i < farmedBalances[msg.sender][lpToken].length;
                i++
            ) {
                farmedBalances[msg.sender][lpToken][i] = 0; // remove user staking balance
                farmingTimestamps[msg.sender][lpToken][i] = 0; // remove user staking start times
            }
            userFarmCount[msg.sender][lpToken] = 0;
            claimedReward[msg.sender][lpToken] = 0;
            emit RemoveFarmedToken(address(this), msg.sender, balance);
        }
    }

    // Returns the reward of the caller
    function calculateReward(address _rewardAddress, IBEP20 lpToken)
        public
        view
        returns (uint256)
    {
        uint256 balances;
        uint256 rewards = 0;
        uint256 timeDifferences;
        for (uint256 i = 0; i < userFarmCount[_rewardAddress][lpToken]; i++) {
            if (
                block.timestamp >=
                farmingTimestamps[_rewardAddress][lpToken][i] +
                    poolInfo[lpToken].rewardInterval
            ) {
                balances =
                    balances +
                    farmedBalances[_rewardAddress][lpToken][i] /
                    10**18;
                if (balances > 0) {
                    timeDifferences =
                        block.timestamp -
                        farmingTimestamps[_rewardAddress][lpToken][i];
                    uint256 timeFactor = timeDifferences;
                    // .div(60)
                    // .div(60)
                    // .div(24)
                    // .div(7); //consider week
                    uint256 apyFactorInWei = (poolInfo[lpToken].rewardRate *
                        timeFactor);
                    rewards =
                        rewards +
                        ((((((balances * 100) /
                            (poolInfo[lpToken].totalFarmedAmount / 10**18)) *
                            (10**18)) +
                            (timeFactor * (10**18)) +
                            apyFactorInWei) * balances) / 100);
                }
            } else {
                break;
            }
        }
        uint256 oldReward = userInfo[_rewardAddress][lpToken].oldReward;
        uint256 totalReward;
        if (claimedReward[_rewardAddress][lpToken] > rewards) {
            totalReward = 0;
        } else {
            totalReward =
                (rewards + oldReward) -
                claimedReward[_rewardAddress][lpToken];
        }
        return totalReward;
    }

    function sendRewardTokens(IBEP20 lpToken, uint256 calculatedReward)
        internal
        virtual
        returns (bool)
    {
        bool rewardStatus;
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
            rewardStatus = true;
        }
        return rewardStatus;
    }

    function farmMyReward(IBEP20 lpToken) external nonReentrant whenNotPaused {
        require(
            userInfo[msg.sender][lpToken].farmedAmount > 0,
            "Farming: No farmed balance available"
        );
        uint256 reward = calculateReward(msg.sender, lpToken);
        require(reward > 0, "Farming: No reward available to stake");

        // Upgrade state variables.
        farmedBalances[msg.sender][lpToken].push(reward);
        farmingTimestamps[msg.sender][lpToken].push(block.timestamp);
        userFarmCount[msg.sender][lpToken]++;

        userInfo[msg.sender][lpToken].farmedAmount += reward; // update user farming balance
        userInfo[msg.sender][lpToken].farmingStartTime = block.timestamp; // save the time when they started farming
        // update farming status
        userInfo[msg.sender][lpToken].isFarming = true;
        userInfo[msg.sender][lpToken].hasFarmed = true;
        poolInfo[lpToken].totalFarmedAmount += reward;
        emit FarmedToken(msg.sender, address(this), reward);
    }

    /*
    @dev function used to claim only the reward for the caller of the method
    */
    function claimMyReward(IBEP20 lpToken) external nonReentrant whenNotPaused {
        require(
            userInfo[msg.sender][lpToken].isFarming,
            "FARMING: No staked token balance available"
        );
        uint256 balance = userInfo[msg.sender][lpToken].farmedAmount;
        require(balance > 0, "FARMING: Balance cannot be 0");
        uint256 reward = calculateReward(msg.sender, lpToken);
        require(reward > 0, "FARMING: Calculated Reward zero");
        uint256 rewardTokens = poolInfo[lpToken].rewardToken.balanceOf(
            address(this)
        );
        require(rewardTokens > reward, "FARMING: Not Enough Reward Balance");
        bool rewardSuccessStatus = sendRewardTokens(lpToken, reward);
        //stakingStartTime (set to current time)
        require(rewardSuccessStatus, "FARMING: Claim Reward Failed");
        claimedReward[msg.sender][lpToken] =
            claimedReward[msg.sender][lpToken] +
            reward;
        userInfo[msg.sender][lpToken].farmingStartTime = block.timestamp;
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

    function upgradeUsers(
        address userAddress,
        IBEP20 _lpToken,
        uint256[] memory balances,
        uint256[] memory timestamps,
        uint256 _claimedReward
    ) public onlyOwner {
        for (uint256 i = 0; i < balances.length; i++) {
            farmedBalances[userAddress][_lpToken].push(balances[i]);
            farmingTimestamps[userAddress][_lpToken].push(timestamps[i]);
            userFarmCount[userAddress][_lpToken]++;
        }
        claimedReward[userAddress][_lpToken] = _claimedReward;
    }

    function removeUsers(address userAddress, IBEP20 _lpToken)
        public
        onlyOwner
    {
        delete farmedBalances[userAddress][_lpToken];
        delete farmingTimestamps[userAddress][_lpToken];
        userFarmCount[userAddress][_lpToken] = 0;
        claimedReward[userAddress][_lpToken] = 0;
    }

    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
