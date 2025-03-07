import { ethers } from 'ethers';

import { sfcAbi } from '../../contracts/sfc.abi';

class StakingService {
    signer: ethers.Signer;
    provider: ethers.Provider;
    contract: ethers.Contract;

    constructor() {
        this.provider = new ethers.JsonRpcProvider('https://rpc.soniclabs.com');

        this.signer = ethers.Wallet.fromPhrase(process.env.MNEMONIC!).connect(this.provider);

        this.contract = new ethers.Contract("0xFC00FACE00000000000000000000000000000000", sfcAbi, this.signer);
    }
}

export default StakingService;