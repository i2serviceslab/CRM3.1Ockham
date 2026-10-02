const fs = require('fs');
let code = fs.readFileSync('src/components/hermes/HermesAgentStudio.tsx', 'utf8');

const oldScroll = `  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };`;

const newScroll = `  const prevMsgLength = useRef(messages.length);
  useEffect(() => {
    // Only auto-scroll when a brand new message appears or we are sending, 
    // to prevent snapping to bottom during background polling
    if (sending || messages.length > prevMsgLength.current) {
      scrollToBottom();
    }
    prevMsgLength.current = messages.length;
  }, [messages, sending]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };`;

code = code.replace(oldScroll, newScroll);
fs.writeFileSync('src/components/hermes/HermesAgentStudio.tsx', code);
