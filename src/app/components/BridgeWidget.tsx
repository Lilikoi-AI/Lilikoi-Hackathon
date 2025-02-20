import { useEffect } from 'react';

interface BridgeWidgetProps {
  fromChainId?: string;
  toChainId?: string;
  tokenAddress?: string;
  amount?: string;
  theme?: 'light' | 'dark';
}

export function BridgeWidget({
  fromChainId = '1', // Default to Ethereum
  toChainId = '56', // Default to BSC
  tokenAddress,
  amount,
  theme = 'dark'
}: BridgeWidgetProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://widgets.debridge.finance/sdk.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div 
      className="debridge-widget-container"
      style={{
        width: '100%',
        maxWidth: '480px',
        margin: '20px auto',
        borderRadius: '12px',
        overflow: 'hidden'
      }}
    >
      <div 
        className="debridge-widget"
        data-widget="true"
        data-from-chain={fromChainId}
        data-to-chain={toChainId}
        data-from-token={tokenAddress}
        data-amount={amount}
        data-theme={theme}
        style={{
          width: '100%',
          height: '600px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      />
    </div>
  );
} 