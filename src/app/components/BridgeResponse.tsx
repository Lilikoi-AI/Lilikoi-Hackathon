import { useState } from 'react';
import { BridgeWidget } from './BridgeWidget';

interface BridgeResponseProps {
  fromChain: string;
  toChain: string;
  tokenAddress?: string;
  amount?: string;
}

export function BridgeResponse({
  fromChain,
  toChain,
  tokenAddress,
  amount
}: BridgeResponseProps) {
  const [showWidget, setShowWidget] = useState(false);

  const chainIdMap: Record<string, string> = {
    'ETHEREUM': '1',
    'BSC': '56',
    'ARBITRUM': '42161',
    'BASE': '8453'
  };

  return (
    <div className="bridge-response">
      <div className="bridge-info">
        <h3>Bridge Transaction Details</h3>
        <ul>
          <li>From Chain: {fromChain}</li>
          <li>To Chain: {toChain}</li>
          {tokenAddress && <li>Token: {tokenAddress}</li>}
          {amount && <li>Amount: {amount}</li>}
        </ul>
        {!showWidget ? (
          <button
            onClick={() => setShowWidget(true)}
            className="show-widget-button"
          >
            Open Bridge Widget
          </button>
        ) : (
          <BridgeWidget
            fromChainId={chainIdMap[fromChain]}
            toChainId={chainIdMap[toChain]}
            tokenAddress={tokenAddress}
            amount={amount}
          />
        )}
      </div>
    </div>
  );
} 