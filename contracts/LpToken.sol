// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LpToken is ERC20{

    constructor () ERC20("POLKADOG", "PDOG") {
        _mint(msg.sender, 100000000 * (10 ** uint256(decimals())));
    }
}