import { BridgeResponse } from './BridgeResponse';

interface ChatMessage {
  text: string;
  component?: {
    type: string;
    props: {
      fromChain: string;
      toChain: string;
      tokenAddress?: string;
      amount?: string;
    };
  };
}

function ChatMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="message">
      <p>{message.text}</p>
      {message.component?.type === 'BRIDGE_WIDGET' && (
        <BridgeResponse {...message.component.props} />
      )}
    </div>
  );
}

export default ChatMessage;