function ChatMessage({ message }: { message: any }) {
  if (message.component?.type === 'BRIDGE_WIDGET') {
    return (
      <div className="message">
        <p>{message.text}</p>
        <BridgeResponse {...message.component.props} />
      </div>
    );
  }

  return (
    <div className="message">
      <p>{message.text}</p>
    </div>
  );
} 