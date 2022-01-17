const PDOGFarming = artifacts.require("EinsteinFarming");
const LpToken = artifacts.require("LpToken");
const RewardToken = artifacts.require("RewardToken");
const { advanceTime, advanceBlock } = require("./helper");
const TimeBoundInsecond = 259200;

let APY = 20;

let users = [
    {
        stakedBalance: [100],
        stakeTime: 4,
    },
    {
        stakedBalance: [250],
        stakeTime: 8,
    },
    {
        stakedBalance: [350],
        stakeTime: 5,
    },
    {
        stakedBalance: [150],
        stakeTime: 6,
    },
    {
        stakedBalance: [150],
        stakeTime: 3,
    },
];

async function calculateReward(user, stakeWeeks, totalStakedBalance) {
    return Promise.resolve(
        (((user.stakedBalance[0] / totalStakedBalance) * 100 + stakeWeeks + (APY / 52) * stakeWeeks) *
            user.stakedBalance[0]) /
        100
    );
}

contract("PDOG Farming", async (accounts) => {
    let farmingToken, lpToken, rewardToken;
    before(async () => {
        farmingToken = await PDOGFarming.deployed();
        lpToken = await LpToken.deployed();
        rewardToken = await RewardToken.deployed();
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
        for (let i = 0; i < 5; i++) {
            await lpToken.transfer(accounts[i], (users[i].stakedBalance[0] * 10 ** 18).toString());
            await lpToken.approve(
                farmingToken.address,
                (users[i].stakedBalance[0] * 10 ** 18).toString(),
                {
                    from: accounts[i],
                }
            );
            await farmingToken.farmTokensForReward(_lpToken, users[i].stakedBalance[0], {
                from: accounts[i],
            });
        }
    });

    describe(`Calculate rewards for 5 users:`, async () => {
        context("After 1 week", async () => {
            it(`User-1 should have ${calculateReward(users[0], 1, 1000)}`, async () => {
                // moving timestamp to week
                await advanceTime(604800);
                // mining the block
                await advanceBlock();
                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[0], {
                    from: accounts[0],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[0],
                            1,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });

            it(`User-2 should have ${calculateReward(users[1], 1, 1000)}`, async () => {
                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[1], {
                    from: accounts[1],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[1],
                            1,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });

            it(`User-3 should have ${calculateReward(users[1], 1, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();

                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[2], {
                    from: accounts[2],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[2],
                            1,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });
            it(`User-4 should have ${calculateReward(users[1], 1, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();

                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[3], {
                    from: accounts[3],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[3],
                            1,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });

            it(`User-5 should have ${calculateReward(users[1], 1, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();

                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[4], {
                    from: accounts[4],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[4],
                            1,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });
        });

        context("After 2 weeks", async () => {
            it(`User-1 should have ${calculateReward(users[0], 2, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();
                // moving timestamp to week
                await advanceTime(604800);
                // mining the block
                await advanceBlock();
                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[0], {
                    from: accounts[0],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[0],
                            2,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });

            it(`User-2 should have ${calculateReward(users[1], 2, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();

                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[1], {
                    from: accounts[1],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[1],
                            2,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });

            it(`User-3 should have ${calculateReward(users[1], 2, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();

                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[2], {
                    from: accounts[2],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[2],
                            2,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });

            it(`User-4 should have ${calculateReward(users[1], 1, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();

                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[3], {
                    from: accounts[3],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[3],
                            2,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });

            it(`User-5 should have ${calculateReward(users[1], 2, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();

                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[4], {
                    from: accounts[4],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[4],
                            2,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });
        });

        context("After 3 weeks", async () => {
            it(`User-1 should have ${calculateReward(users[0], 3, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();
                // moving timestamp to week
                await advanceTime(604800);
                // mining the block
                await advanceBlock();
                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[0], {
                    from: accounts[0],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[0],
                            3,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });

            it(`User-2 should have ${calculateReward(users[1], 3, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();

                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[1], {
                    from: accounts[1],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[1],
                            3,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });

            it(`User-3 should have ${calculateReward(users[1], 3, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();

                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[2], {
                    from: accounts[2],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[2],
                            3,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });

            it(`User-4 should have ${calculateReward(users[1], 3, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();

                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[3], {
                    from: accounts[3],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[3],
                            3,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });

            it(`User-5 should have ${calculateReward(users[1], 3, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();

                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[4], {
                    from: accounts[4],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[4],
                            3,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });
        });

        context("After 4 weeks", async () => {
            it(`User-1 should have ${calculateReward(users[0], 4, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();
                // moving timestamp to week
                await advanceTime(604800);
                // mining the block
                await advanceBlock();
                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[0], {
                    from: accounts[0],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[0],
                            4,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });

            it(`User-2 should have ${calculateReward(users[1], 4, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();

                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[1], {
                    from: accounts[1],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[1],
                            4,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });

            it(`User-3 should have ${calculateReward(users[1], 4, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();

                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[2], {
                    from: accounts[2],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[2],
                            4,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });

            it(`User-4 should have ${calculateReward(users[1], 4, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();

                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[3], {
                    from: accounts[3],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[3],
                            4,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });

            it(`User-5 should have ${calculateReward(users[1], 4, 1000)}`, async () => {
                const farmingToken = await PDOGFarming.deployed();

                var userReward = await farmingToken.calculateReward(lpToken.address, accounts[4], {
                    from: accounts[4],
                });
                assert.equal(
                    userReward.toString().slice(0, -5),
                    (
                        (await calculateReward(
                            users[4],
                            4,
                            (await farmingToken.poolInfo(lpToken.address).totalFarmedAmount) /
                            10 ** 18
                        )) *
                        10 ** 18
                    )
                        .toString()
                        .slice(0, -5),
                    "Reward calculated for 1 week"
                );
            });
        });
    });
});
