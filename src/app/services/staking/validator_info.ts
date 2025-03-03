import { ethers } from 'ethers';

import { stakeService } from '.';

interface ValidatorInfo {
    validatorId: number;
    status: number;
    totalStake: string;
    apr: number;
    uptime: number;
    commission: number;
}


async function getValidatorsList() {
    const currentEpoch = await stakeService.contract.currentEpoch();
    const validatorIds = await stakeService.contract.getEpochValidatorIDs(currentEpoch);
    
    const validators = await Promise.all(validatorIds.map(async (id: number): Promise<ValidatorInfo> => {
        const info = await stakeService.contract.getValidator(id);
        const uptime = await stakeService.contract.getEpochAverageUptime(currentEpoch, id);
        
        return {
            validatorId: id,
            status: info.status,
            totalStake: ethers.formatEther(info.receivedStake),
            apr: Number(info.rewardCut) / 1e18 * 100, // Convert to percentage
            uptime: Number(uptime) / 1e18 * 100, // Convert to percentage
            commission: Number(info.commission) / 1e18 * 100 // Convert to percentage};
        };
    }));

    return validators;
}

export default getValidatorsList;