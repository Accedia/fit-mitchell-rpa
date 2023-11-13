import Markdown from 'markdown-to-jsx';
import React from 'react';
import { Icon, Message, Segment } from 'semantic-ui-react';
import { help_text } from '../constants/help_text';

interface ManualProps {}

const Manual: React.FC<ManualProps> = () => {
  return (
    <div className="markdown-container">
      <Message info attached="top">
        <Icon name="question" />
        REV Import Technology
      </Message>
      <Segment raised attached className="markdown-preview">
        <Markdown>{help_text || ''}</Markdown>
      </Segment>
      <Message warning attached="bottom">
        <Icon name="info" />
        For more information contact FIT Administrator
      </Message>
    </div>
  );
};

export default Manual;
