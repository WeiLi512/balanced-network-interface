import React from 'react';

import styled from 'styled-components';

const InputContainer = styled.div`
  display: inline-flex;
  width: 100%;
`;

const AddressInputLabel = styled.button`
  border: 2px solid #0b284c;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
  background-color: #0b284c;
  display: flex;
  align-items: center;
  width: 120px;
  height: 43px;
  padding: 4px 15px;
  color: #ffffff;
  border-radius: 10px 0 0 10px;
  transition: border 0.3s ease, background-color 0.3s ease, color 0.3s ease;
  font-size: 14px;
  font-weight: bold;
  justify-content: center;
`;

const AddressInput = styled.input`
  flex: 1;
  width: 100%;
  height: 43px;
  text-align: right;
  border-radius: 0 10px 10px 0;
  border: 2px solid #0c2a4d;
  background-color: #0c2a4d;
  color: #ffffff;
  padding: 7px 20px;
  outline: none;
  transition: border 0.3s ease;
  overflow: visible;
  font-family: inherit;
  font-size: 14px;
  font-weight: bold;
  line-height: 1.15;
  margin: 0;

  :hover,
  :focus {
    border: 2px solid #2ca9b7;
  }
`;

interface AddressInputPanelProps {
  value: string;
  onUserInput: (value: string) => void;
}

export default function AddressInputPanel({ value, onUserInput }: AddressInputPanelProps) {
  return (
    <InputContainer>
      <AddressInputLabel>Address</AddressInputLabel>

      <AddressInput value={value} onChange={event => onUserInput(event.target.value)} />
    </InputContainer>
  );
}
