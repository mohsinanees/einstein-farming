const PDOGFarming = artifacts.require("EinsteinFarming");
const LpToken = artifacts.require("LpToken");
const RewardToken = artifacts.require("RewardToken");
const { advanceTime, advanceBlock } = require("./helper");
const TimeBoundInsecond = 259200;

require("chai").should().assert;

contract("EinsteinFarming", (accounts) => {
    const _name = "EINSTEIN-Yield-Farming";

    let farmingToken, lpToken, rewardToken;
    beforeEach(async () => {
        farmingToken = await PDOGFarming.deployed();
        lpToken = await LpToken.deployed();
        rewardToken = await RewardToken.deployed();
    });

    describe("Initial State", () => {
        it("has the correct name", async () => {
            const name = await farmingToken.name();
            assert.equal(name, _name);
        });

        it("has the correct owner", async () => {
            const owner = await farmingToken.owner();
            assert.equal(owner, accounts[0]);
        });
    });

    describe("Add Pool", async () => {
        context("Add Pool by owner", async () => {
            it("Should pass when pool added by owner", async () => {
                let _lpToken = lpToken.address;
                let _rewardToken = rewardToken.address;
                let _rewardRateInWei = (20 * 10 ** 18).toString();
                let _rewardIntervalInSeconds = "60";
                let _startBlock = await web3.eth.getBlockNumber();
                let _lockPeriodInSeconds = "300";
                let _endTime = 0;
                let totalFarmedAmount = 0;

                let response = await farmingToken.addPool(
                    _lpToken,
                    _rewardToken,
                    _rewardRateInWei,
                    _rewardIntervalInSeconds,
                    _startBlock,
                    _lockPeriodInSeconds,
                    _endTime,
                    totalFarmedAmount
                );
                assert.property(response, "receipt", { status: true });
            });

            it("Should pass when pool added with future block", async () => {
                let _lpToken = "0xcCFa1f4699c05E14765d09cEf23Fdff34986Bd4C";
                let _rewardToken = rewardToken.address;
                let _rewardRateInWei = (20 * 10 ** 18).toString();
                let _rewardIntervalInSeconds = "60";
                let _startBlock = (await web3.eth.getBlockNumber()) + 1000;
                let _lockPeriodInSeconds = "300";
                let _endTime = 0;
                let totalFarmedAmount = 0;

                let response = await farmingToken.addPool(
                    _lpToken,
                    _rewardToken,
                    _rewardRateInWei,
                    _rewardIntervalInSeconds,
                    _startBlock,
                    _lockPeriodInSeconds,
                    _endTime,
                    totalFarmedAmount
                );
                assert.property(response, "receipt", { status: true });
            });
        });

        context("Add Pool by non-owner", async () => {
            it("Should fail when pool added by non-owner", async () => {
                let _lpToken = lpToken.address;
                let _rewardToken = rewardToken.address;
                let _rewardRateInWei = (20 * 10 ** 18).toString();
                let _rewardIntervalInSeconds = "60";
                let _startBlock = await web3.eth.getBlockNumber();
                let _lockPeriodInSeconds = "300";
                let _endTime = 0;
                let totalFarmedAmount = 0;

                try {
                    await farmingToken.addPool(
                        _lpToken,
                        _rewardToken,
                        _rewardRateInWei,
                        _rewardIntervalInSeconds,
                        _startBlock,
                        _lockPeriodInSeconds,
                        _endTime,
                        totalFarmedAmount,
                        { from: accounts[1] }
                    );
                } catch (error) {
                    const errorMessage = "Ownable: caller is not the owner";
                    assert.equal(error.reason, errorMessage);
                }
            });
        });
    });

    describe("Farm tokens", async () => {
        context("Farm tokens with less allowances or less balance", async () => {
            it("Should fail when user farm tokens with less allowances by owner", async () => {
                let _lpToken = lpToken.address;
                let _amount = (100 * 10 ** 18).toString();
                try {
                    await farmingToken.farmTokensForReward(_lpToken, _amount, {
                        from: accounts[0],
                    });
                } catch (error) {
                    const errorMessage = "ERC20: transfer amount exceeds allowance";
                    assert.equal(error.reason, errorMessage);
                }
            });

            it("Should fail when user farm tokens with less balance", async () => {
                let _lpToken = lpToken.address;
                let _amount = (100 * 10 ** 18).toString();
                try {
                    await farmingToken.farmTokensForReward(_lpToken, _amount, {
                        from: accounts[1],
                    });
                } catch (error) {
                    const errorMessage = "Farming: Insufficient token balance";
                    assert.equal(error.reason, errorMessage);
                }
            });

            it("Should fail when user farm tokens with less allowances by non-owner", async () => {
                let _lpToken = lpToken.address;
                let _amount = (100 * 10 ** 18).toString();
                await lpToken.transfer(accounts[1], (10 * 10 * 10 ** 18).toString(), {
                    from: accounts[0],
                });
                try {
                    await farmingToken.farmTokensForReward(_lpToken, _amount, {
                        from: accounts[1],
                    });
                } catch (error) {
                    const errorMessage = "ERC20: transfer amount exceeds allowance";
                    assert.equal(error.reason, errorMessage);
                }
            });
        });

        context("Farm tokens with valid allowances by owner and non-owner", async () => {
            it("Should pass when user farm tokens by owner", async () => {
                let _lpToken = lpToken.address;
                let _amount = (100 * 10 ** 18).toString();
                await lpToken.approve(farmingToken.address, _amount, { from: accounts[0] });
                let response = await farmingToken.farmTokensForReward(_lpToken, _amount, {
                    from: accounts[0],
                });
                assert.property(response, "receipt", { status: true });
            });

            it("Should pass when user farm tokens by non-owner", async () => {
                let _lpToken = lpToken.address;
                let _amount = (100 * 10 ** 18).toString();
                await lpToken.transfer(accounts[1], _amount, { from: accounts[0] });
                await lpToken.approve(farmingToken.address, _amount, { from: accounts[1] });
                let response = await farmingToken.farmTokensForReward(_lpToken, _amount, {
                    from: accounts[1],
                });
                assert.property(response, "receipt", { status: true });
            });

            it("Should pass when user farm tokens by non-owner", async () => {
                let _lpToken = lpToken.address;
                let _amount = (100 * 10 ** 18).toString();
                await lpToken.transfer(accounts[2], _amount, { from: accounts[0] });
                await lpToken.approve(farmingToken.address, _amount, { from: accounts[2] });
                let response = await farmingToken.farmTokensForReward(_lpToken, _amount, {
                    from: accounts[2],
                });
                assert.property(response, "receipt", { status: true });
            });
        });

        context("Farm tokens error cases", async () => {
            it("Should fail when user farm tokens that is not yet started", async () => {
                let _lpToken = "0xcCFa1f4699c05E14765d09cEf23Fdff34986Bd4C";
                let _amount = (100 * 10 ** 18).toString();
                try {
                    await farmingToken.farmTokensForReward(_lpToken, _amount, {
                        from: accounts[0],
                    });
                } catch (error) {
                    const errorMessage = "Farming: Start Reward Block has not reached";
                    assert.equal(error.reason, errorMessage);
                }
            });

            it("Should fail when user farm tokens before lock period is over", async () => {
                let _lpToken = lpToken.address;
                let _amount = (100 * 10 ** 18).toString();

                try {
                    await lpToken.approve(farmingToken.address, _amount, { from: accounts[0] });
                    await farmingToken.farmTokensForReward(_lpToken, _amount, {
                        from: accounts[0],
                    });
                } catch (error) {
                    const errorMessage = "Farming is locked";
                    assert.equal(error.reason, errorMessage);
                }
            });
        });
    });

    describe("Emergency Withdraw Farmed tokens", async () => {
        it("Should pass when user withdraw farmed tokens as emergency", async () => {
            await farmingToken.requestWithdraw(lpToken.address, { from: accounts[1] });

            // moving timestamp
            await advanceTime(TimeBoundInsecond);
            // mining the block
            await advanceBlock();

            let response = await farmingToken.emergencyWithdraw(lpToken.address, {
                from: accounts[1],
            });
            assert.property(response, "receipt", { status: true });
        });

        it("Should fail when user withdraw unfarmed tokens as emergency", async () => {
            try {
                await farmingToken.emergencyWithdraw("0x8ee157b4cd9a59c651887c84ca193f96c0c465fb", {
                    from: accounts[1],
                });
            } catch (error) {
                const errorMessage = "Farming: No farmed balance available";
                assert.equal(error.reason, errorMessage);
            }
        });
    });

    describe("Calculate reward for farmed tokens", async () => {
        it("Should pass when user calculate reward", async () => {
            // moving timestamp for a week
            await advanceTime(604800);
            // mining the block
            await advanceBlock();
            let reward = await farmingToken.calculateReward(lpToken.address, accounts[0]);
            assert.equal(reward.toString(), "34384615384615384615", "Reward will be 1%");
        });
    });

    describe("Withdraw Farmed tokens", async () => {
        context("Withdraw farmed tokens error cases", async () => {
            it("Should fail when user withdraw farmed tokens in lock period", async () => {
                let _lpToken = lpToken.address;
                let _amount = (100 * 10 ** 18).toString();
                try {
                    await lpToken.approve(farmingToken.address, _amount, { from: accounts[0] });
                    let response = await farmingToken.farmTokensForReward(_lpToken, _amount, {
                        from: accounts[0],
                    });

                    await farmingToken.requestWithdraw(lpToken.address, { from: accounts[0] });
                    await farmingToken.setLockPeriod(lpToken.address, 604800, {
                        from: accounts[0],
                    });

                    // moving timestamp
                    await advanceTime(TimeBoundInsecond);
                    // mining the block
                    await advanceBlock();

                    await farmingToken.withdrawFarmedTokens(lpToken.address);
                } catch (error) {
                    const errorMessage = "Farming: Is in lock period";
                    assert.equal(error.reason, errorMessage);
                }
            });

            it("Should fail when user withdraw farmed tokens - when there is no sufficient reward tokens", async () => {
                try {
                    // Setting the lock in period to 300 seconds itself
                    await farmingToken.setLockPeriod(lpToken.address, 300, { from: accounts[0] });
                    // moving timestamp
                    await advanceTime(301);
                    // mining the block
                    await advanceBlock();
                    await farmingToken.withdrawFarmedTokens(lpToken.address);
                } catch (error) {
                    const errorMessage = "Farming: Not enough reward balance";
                    assert.equal(error.reason, errorMessage);
                }
            });
        });

        context("Withdraw farmed tokens by owner and non-owner", async () => {
            it("Should pass when user withdraw farmed tokens by owner", async () => {
                await rewardToken.transfer(farmingToken.address, (500 * 10 ** 18).toString());
                await farmingToken.requestWithdraw(lpToken.address, { from: accounts[0] });
                // moving timestamp
                await advanceTime(TimeBoundInsecond);
                // mining the block
                await advanceBlock();
                let response = await farmingToken.withdrawFarmedTokens(lpToken.address);
                assert.property(response, "receipt", { status: true });
            });

            it("Should pass when user withdraw farmed tokens by non-owner", async () => {
                await farmingToken.requestWithdraw(lpToken.address, { from: accounts[2] });
                // moving timestamp
                await advanceTime(TimeBoundInsecond);
                // mining the block
                await advanceBlock();
                let response = await farmingToken.withdrawFarmedTokens(lpToken.address, {
                    from: accounts[2],
                });
                assert.property(response, "receipt", { status: true });
            });
        });

        context("Withdraw wrong tokens", async () => {
            it("Should fail when user try to withdraw tokens with balance 0", async () => {
                try {
                    await farmingToken.withdrawFarmedTokens(lpToken.address);
                } catch (error) {
                    const errorMessage = "Farming: No farmed balance available";
                    assert.equal(error.reason, errorMessage);
                }
            });

            it("Should fail when user try to withdraw wrong tokens", async () => {
                try {
                    await farmingToken.withdrawFarmedTokens(lpToken.address);
                } catch (error) {
                    const errorMessage = "Farming: No farmed balance available";
                    assert.equal(error.reason, errorMessage);
                }
            });
        });
    });

    describe("Withdraw bep20 tokens", async () => {
        context("Withdraw bep20 tokens by owner", async () => {
            it("Should pass when user withdraw bep20 tokens", async () => {
                let response = await farmingToken.withdrawBEP20Token(
                    rewardToken.address,
                    (10 ** 18).toString()
                );
                assert.property(response, "receipt", { status: true });
            });

            it("Should pass when user withdraw bep20 tokens - with higher amount", async () => {
                try {
                    await farmingToken.withdrawBEP20Token(
                        rewardToken.address,
                        "100000000000000000000000"
                    );
                } catch (error) {
                    const errorMessage = "Amount exceeds the balance";
                    assert.equal(error.reason, errorMessage);
                }
            });
        });

        context("Withdraw bep20 tokens by non-owner", async () => {
            it("Should fail when user withdraw bep20 tokens", async () => {
                try {
                    await farmingToken.withdrawBEP20Token(
                        rewardToken.address,
                        (1 * 10 ** 18).toString(),
                        { from: accounts[0] }
                    );
                } catch (error) {
                    const errorMessage = "Ownable: caller is not the owner";
                    assert.equal(error.reason, errorMessage);
                }
            });
        });
    });

    describe("Set values", async () => {
        it("setRewardRate", async () => {
            let _lpToken = lpToken.address;
            let _rewardRateInWei = (2 * 10 ** 18).toString();
            await farmingToken.setRewardRate(_lpToken, _rewardRateInWei);
            let pool = await farmingToken.poolInfo(_lpToken);
            assert.equal(await pool.rewardRate, _rewardRateInWei);
        });

        it("setRewardToken", async () => {
            let _lpToken = lpToken.address;
            let _rewardToken = "0x8ee157b4cd9a59c651887c84ca193f96c0c465fb";
            await farmingToken.setRewardToken(_lpToken, _rewardToken);
            let pool = await farmingToken.poolInfo(_lpToken);
            assert.equal(await pool.rewardToken.toLowerCase(), _rewardToken.toLowerCase());
        });

        it("setRewardInterval", async () => {
            let _lpToken = lpToken.address;
            let _rewardInterval = "120";
            await farmingToken.setRewardInterval(_lpToken, _rewardInterval);
            let pool = await farmingToken.poolInfo(_lpToken);
            assert.equal(await pool.rewardInterval, _rewardInterval);
        });

        it("setEndTime", async () => {
            let _lpToken = lpToken.address;
            let currentTime = Math.floor(new Date().getTime() / 1000);
            let _endTime = currentTime + 200;
            await farmingToken.setEndTime(_lpToken, _endTime);
            let pool = await farmingToken.poolInfo(_lpToken);
            assert.equal(await pool.endTime, _endTime);
        });

        context("Farm tokens after end time", () => {
            it("Should fail when user farm tokens after end time", async () => {
                let _lpToken = lpToken.address;
                let _amount = (100 * 10 ** 18).toString();

                await advanceBlock();
                await advanceTime(201);

                try {
                    await farmingToken.farmTokensForReward(_lpToken, _amount, {
                        from: accounts[0],
                    });
                } catch (error) {
                    const errorMessage = "Farming: Has ended";
                    assert.equal(error.reason, errorMessage);
                }
            });
        });
    });
});
