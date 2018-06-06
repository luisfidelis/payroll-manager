// --- Contracts
let PayrollManager = artifacts.require("./PayrollManager.sol")
let EURToken = artifacts.require("./token/EURToken.sol")

module.exports = async (deployer, network, accounts) => {
    if(network.indexOf('dev') > -1) {
        await deployer.deploy(EURToken, { from: accounts[0] })
        return deployer.deploy(PayrollManager, EURToken.address, accounts[4] ) // accounts[4] = Oracle service
    }
}
