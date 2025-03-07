import { ethers } from 'ethers';

import { stakeService } from '.';
// import StakingService from './staking_service';

async function delegate(validatorId: number, amount: number) {
    try {
        const tx = await stakeService.contract.delegate(validatorId, {
            value: ethers.parseEther(amount.toString())
        });
        await tx.wait();
        return { success: true, hash: tx.hash };
    } catch (error) {
        console.error('Delegation failed:', error);
        return { success: false, error };
    }
}

// Claim rewards
async function claimRewards(validatorId: number) {
    const rewards = await stakeService.contract.pendingRewards(await stakeService.signer.getAddress(), validatorId);
    if (rewards === 0) throw new Error('No rewards to claim');

    const tx = await stakeService.contract.claimRewards(validatorId);
    await tx.wait();

    return { success: true, hash: tx.hash };
}

async function getNextWrID(delegator: string, validatorId: number) {
    try {        
        // Start from 0 and find the next available wrID
        let wrID = 0;
        while (true) {
            const request = await stakeService.contract.getWithdrawalRequest(delegator, validatorId, wrID);
            // If amount is 0, this wrID is available
            if (request.amount === BigInt(0)) {
                return wrID;
            }
            wrID++;
        }
    } catch (error) {
        console.error('Error getting next wrID:', error);
        throw error;
    }
}

// Undelegate with withdrawal request
async function undelegate(validatorId: number, amount: number) {
    const nextWrID = await getNextWrID(await stakeService.signer.getAddress(), validatorId);
    console.log('Using wrID:', nextWrID);

    const tx = await stakeService.contract.undelegate(
        validatorId,
        nextWrID,
        ethers.parseEther(amount.toString())
    );
    await tx.wait();

    return { success: true, hash: tx.hash };
}

export { delegate, claimRewards, undelegate };