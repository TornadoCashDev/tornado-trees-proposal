/* global task, ethers */
require('dotenv').config()
require('@nomiclabs/hardhat-waffle')
const ens = require('eth-ens-namehash')

task('namehashes', 'Prints the list of tornado instances and corresponding ens namehashes', () => {
  const mineable = [
    'eth-01.tornadocash.eth',
    'eth-1.tornadocash.eth',
    'eth-10.tornadocash.eth',
    'eth-100.tornadocash.eth',
  ]
  const allowed = [
    'dai-100.tornadocash.eth',
    'dai-1000.tornadocash.eth',
    'cdai-5000.tornadocash.eth',
    'cdai-50000.tornadocash.eth',
    'usdc-100.tornadocash.eth',
    'usdc-1000.tornadocash.eth',
    'usdt-100.tornadocash.eth',
    'usdt-1000.tornadocash.eth',
  ]
  console.log('Allowed instances:')
  allowed.forEach((name) => {
    console.log(`${name} - ${ens.hash(name)}`)
  })
  console.log('Allowed and mineable instances:')
  mineable.forEach((name) => {
    console.log(`${name} - ${ens.hash(name)}`)
  })
})

async function getEventCount(addresses, selector, fromBlock) {
  const events = addresses.map((address) =>
    ethers.provider.getLogs({
      address,
      fromBlock,
      topics: [ethers.utils.id(selector)],
    }),
  )
  return (await Promise.all(events)).reduce((sum, e) => (sum += e.length), 0)
}

task('searchParams', 'Prints optimal search params for tree updates deployment', async () => {
  const treesAbi = await ethers.getContractFactory('TornadoTrees')
  const trees = treesAbi.attach('0x43a3bE4Ae954d9869836702AFd10393D3a7Ea417')
  const processedDeposits = (await trees.lastProcessedDepositLeaf()).toNumber()
  const processedWithdrawals = (await trees.lastProcessedWithdrawalLeaf()).toNumber()
  const unprocessedDeposits = (await trees.getRegisteredDeposits()).length
  const unprocessedWithdrawals = (await trees.getRegisteredWithdrawals()).length

  const instances = [
    '0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc',
    '0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936',
    '0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF',
    '0xA160cdAB225685dA1d56aa342Ad8841c3b53f291',
  ]

  const proposalDays = 5
  const fromBlock = 11750000

  const fromDate = new Date((await ethers.provider.getBlock(fromBlock)).timestamp * 1000)
  const toDate = new Date((await ethers.provider.getBlock('latest')).timestamp * 1000)
  const days = (toDate - fromDate) / (1000 * 60 * 60 * 24)

  let depositCount = await getEventCount(instances, 'Deposit(bytes32,uint32,uint256)', fromBlock)
  let withdrawalCount = await getEventCount(
    instances,
    'Withdrawal(address,bytes32,address,uint256)',
    fromBlock,
  )

  console.log('Found', depositCount, 'deposits from', fromDate, 'in', days, 'days')
  console.log('Found', withdrawalCount, 'withdrawals from', fromDate, 'in', days, 'days')

  const depositsPerDay = Math.round(depositCount / days)
  const withdrawalsPerDay = Math.round(withdrawalCount / days)

  console.log({
    depositsFrom: processedDeposits + unprocessedDeposits + depositsPerDay * proposalDays,
    depositsStep: Math.round(depositsPerDay / 5),
    withdrawalsFrom: processedWithdrawals + unprocessedWithdrawals + withdrawalsPerDay * proposalDays,
    withdrawalsStep: Math.round(withdrawalsPerDay / 5),
  })
})

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config = {
  solidity: {
    version: '0.6.12',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
    },
  },
  networks: {
    hardhat: {
      blockGasLimit: 9500000,
      gasPrice: 0,
      chainId: 1,
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
        blockNumber: 11494310,
      },
    },
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      accounts: process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY]
        : { mnemonic: 'test test test test test test test test test test test junk' },
    },
  },
  mocha: {
    timeout: 600000,
  },
}

module.exports = config
