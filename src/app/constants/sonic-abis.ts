export const STATE_ORACLE_ABI = [
    "function lastBlockNum() external view returns (uint256)",
    "function lastState() external view returns (bytes32)"
];

export const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)"
];

export const TOKEN_PAIRS_ABI = [
    "function originalToMinted(address) external view returns (address)",
    "function mintedToOriginal(address) external view returns (address)"
];

export const TOKEN_DEPOSIT_ABI = [
    "function deposit(uint256 nonce, address token, uint256 amount) external",
    "function claim(bytes32 txHash, bytes calldata proof) external"
];

export const BRIDGE_ABI = [
    "function withdraw(uint256 nonce, address token, uint256 amount) external",
    "function claim(bytes32 txHash, bytes calldata proof) external"
];