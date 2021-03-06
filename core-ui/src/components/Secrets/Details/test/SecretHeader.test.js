import React from 'react';
import { render } from '@testing-library/react';
import SecretHeader from '../SecretHeader';

export const secretMock = {
  name: 'secretName',
  annotations: {
    annotation1: 'avalue1',
    annotation2: 'avalue2',
  },
};

describe('SecretHeader', () => {
  it('Renders with minimal props', () => {
    const { queryByText } = render(<SecretHeader secret={secretMock} />);

    expect(queryByText('Annotations')).toBeInTheDocument();
  });
});
