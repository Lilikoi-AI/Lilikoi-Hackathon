// Standard ERC20 ABI
export const ERC20_ABI = [
  // Read-only functions
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  
  // State-changing functions
  'function transfer(address to, uint256 value) returns (bool)',
  'function approve(address spender, uint256 value) returns (bool)',
  'function transferFrom(address from, address to, uint256 value) returns (bool)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

// Protocol-specific ABIs
export const AAVE_POOL_ABI = [
  'function getReservesList() view returns (address[])',
  'function getReserveData(address asset) view returns (tuple(uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex))',
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)'
];

export const EULER_MARKETS_ABI = [
  'function getMarkets() view returns (address[])',
  'function getMarketAPY(address underlying) view returns (uint256)',
  'function deposit(uint256 subAccountId, address underlying, uint256 amount)'
];

export const FRAX_STAKING_ABI = [
  'function getPoolAPY() view returns (uint256)',
  'function stake(uint256 amount)'
];

// Bridge ABIs
export const BRIDGE_ABI = [
  'function deposit(address token, uint256 amount) payable',
  'function withdraw(address token, uint256 amount)',
  'function claim(bytes32 depositId, bytes memory proof)',
  'event Deposit(address indexed token, address indexed sender, uint256 amount, bytes32 indexed depositId)',
  'event Withdrawal(address indexed token, address indexed recipient, uint256 amount, bytes32 indexed withdrawalId)'
];

export const STATE_ORACLE_ABI = [
  'function getLatestStateRoot() view returns (bytes32)',
  'function verifyProof(bytes32 root, bytes32 leaf, bytes32[] memory proof) view returns (bool)'
];

export const TOKEN_DEPOSIT_ABI = [
  'function deposit(address token, uint256 amount) payable',
  'function withdraw(address token, uint256 amount)',
  'event Deposit(address indexed token, address indexed sender, uint256 amount)',
  'event Withdrawal(address indexed token, address indexed recipient, uint256 amount)'
];

export const TOKEN_PAIRS_ABI = [
  'function getPair(address tokenA, address tokenB) view returns (address pair)',
  'function allPairs(uint) view returns (address pair)',
  'function allPairsLength() view returns (uint)'
]; 