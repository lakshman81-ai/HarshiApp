import React from 'react';
import ReactDOM from 'react-dom/client';
import Grade8StudyHub from './Grade8_StudyHub_Complete';

test('renders Grade8StudyHub without crashing', () => {
  const div = document.createElement('div');
  const root = ReactDOM.createRoot(div);
  root.render(<Grade8StudyHub />);
  root.unmount();
});
