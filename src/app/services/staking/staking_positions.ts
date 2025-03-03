import { ethers } from 'ethers';

import { stakeService } from '.';

interface StakingPosition {
    validatorId: number;
    stakedAmount: string;
    pendingRewards: string;
    // canWithdraw: boolean;
    // canClaimRewards: boolean;
}

async function getUserStakingPositions(userAddress: string) {
    const currentEpoch = await stakeService.contract.currentEpoch();
    const validatorIds = await stakeService.contract.getEpochValidatorIDs(currentEpoch);
    
    const positions = await Promise.all(validatorIds.map(async (id: number): Promise<StakingPosition> => {
        const stake = await stakeService.contract.getStake(userAddress, id);
        const rewards = await stakeService.contract.pendingRewards(userAddress, id);
        
        return {
            validatorId: id,
            stakedAmount: ethers.formatEther(stake),
            pendingRewards: ethers.formatEther(rewards),
            // canWithdraw: stake.gt(0),
            // canClaimRewards: rewards.gt(0)};
        };
    }));

    return positions.filter(p => p.stakedAmount > 0);
}

export default getUserStakingPositions;