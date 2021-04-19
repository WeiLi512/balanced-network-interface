import React, { useState, useCallback } from 'react';

import * as HwUtils from '@ledgerhq/hw-app-icx/lib/utils';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { BalancedJs } from 'packages/BalancedJs';
import { getLedgerAddressPath, LEDGER_BASE_PATH } from 'packages/BalancedJs/contractSettings';
import { useIconReact } from 'packages/icon-react';
import { Flex, Box, Text } from 'rebass/styled-components';
import styled from 'styled-components';

import { VerticalDivider } from 'app/components/Divider';
import Modal from 'app/components/Modal';
import { Typography } from 'app/theme';
import { ReactComponent as IconexIcon } from 'assets/icons/iconex.svg';
import { ReactComponent as LedgerIcon } from 'assets/icons/ledger.svg';
import bnJs from 'bnJs';
import { ApplicationModal } from 'store/application/actions';
import { useWalletModalToggle, useModalOpen, useChangeWalletType } from 'store/application/hooks';

//const displayAddress = (address: string) => `${address.slice(0, 10)}...${address.slice(-15)}`;

const displayAddress = (address: string) => `${address}`;

const generatePaths = (point: number) => {
  const paths = HwUtils.splitPath(`${LEDGER_BASE_PATH}/${point}'`);
  const buffer = Buffer.alloc(1 + paths.length * 4);
  buffer[0] = paths.length;
  paths.forEach((element, index) => {
    buffer.writeUInt32BE(element, 1 + 4 * index);
  });
  return buffer;
};

const requestLedgerAddress = async ({
  transport,
  paging: { offset, limit },
}: {
  transport: any;
  paging: {
    offset: number;
    limit: number;
  };
}): Promise<any[]> => {
  try {
    const addressFromLedger: any[] = [];

    for (let i = offset; i < offset + limit; i++) {
      const buffer = generatePaths(i);
      const response = await transport.send(0xe0, 0x02, 0x00, 0x01, buffer);

      const publicKeyLength = response[0];
      const addressLength = response[1 + publicKeyLength];

      addressFromLedger.push({
        publicKey: response.slice(1, 1 + publicKeyLength).toString('hex'),
        address: response.slice(1 + publicKeyLength + 1, 1 + publicKeyLength + 1 + addressLength).toString(),
        chainCode: '',
        point: i,
      });
    }

    const addressListWithBalance: any[] = await Promise.all(
      addressFromLedger.map((address: any) => {
        return new Promise((resolve, reject) => {
          bnJs.ICX.balanceOf(address.address)
            .then(balance => {
              resolve({
                ...address,
                balance: BalancedJs.utils.toIcx(balance).toFixed(2),
              });
            })
            .catch(reject);
        });
      }),
    );

    return addressListWithBalance;
  } catch (error) {
    console.error('Error from requestLedgerAddress():', error);
    return [];
  }
};

const LIMIT_PAGING_LEDGER = 5;

const LedgerAddressList = styled(Modal)`
  width: 500px;
`;

const WalletOption = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 5px 20px;
  margin: 0px 10px;
  border-radius: 10px;
  text-decoration: none;
  color: white;
  user-select: none;

  > *:first-child {
    margin-bottom: 10px;
  }

  :hover {
    background-color: ${({ theme }) => theme.colors.bg3};
    opacity: 1;
  }
`;

const StyledModal = styled(Modal).attrs({
  'aria-label': 'dialog',
})`
  &[data-reach-dialog-content] {
    width: 320px;
  }
`;

let transport = null;

export default function WalletModal() {
  const walletModalOpen = useModalOpen(ApplicationModal.WALLET);
  const toggleWalletModal = useWalletModalToggle();
  const [showLedgerAddress, updateShowledgerAddress] = useState(false);
  const [addressList, updateAddressList] = useState<any>([]);
  const [{ offset, limit }, updatePaging] = useState({
    offset: 0,
    limit: LIMIT_PAGING_LEDGER,
  });
  const changeWalletType = useChangeWalletType();

  const toggleShowledgerAddress = useCallback(() => {
    updateShowledgerAddress(!showLedgerAddress);
  }, [showLedgerAddress, updateShowledgerAddress]);

  const { requestAddress, hasExtension } = useIconReact();

  const handleOpenWallet = () => {
    toggleWalletModal();
    requestAddress();
  };

  const updateLedgerAddress = async ({ offset, limit }) => {
    const addressList: any = await requestLedgerAddress({
      transport,
      paging: {
        offset,
        limit,
      },
    });

    updateAddressList(addressList);
  };

  const handleOpenLedger = async () => {
    changeWalletType('LEDGER');
    try {
      transport = await TransportWebUSB.create();

      toggleShowledgerAddress();

      updateLedgerAddress({ offset, limit });

      bnJs.inject({
        legerSettings: {
          transport,
        },
      });
    } catch (err) {
      console.log(err);
      alert('Inject your ledger device, enter your password and retry');
    }
  };

  const getBack = React.useCallback(async () => {
    if (offset <= 0) {
      // should disable page number < 0;
      alert('This is first pages, cannot request more address, try other please.');
      return;
    }
    const currentOffset = offset - limit;

    await updateLedgerAddress({ offset: currentOffset, limit });

    updatePaging({
      limit,
      offset: currentOffset,
    });
  }, [offset, limit]);

  const getNext = React.useCallback(async () => {
    try {
      const next = offset + LIMIT_PAGING_LEDGER;

      await updateLedgerAddress({ offset: next, limit });

      updatePaging({
        limit,
        offset: next,
      });
    } catch (e) {
      console.error('Error when request more address from Ledger: ', e);
    }
  }, [offset, limit]);

  const chooseLedgerAddress = ({ address, point }: { address: string; point: number }) => {
    console.info(address);
    requestAddress({
      address,
      point,
    });
    bnJs.inject({
      account: address,
      legerSettings: {
        path: getLedgerAddressPath(point),
      },
    });
    toggleShowledgerAddress();
    toggleWalletModal();
  };

  return (
    <>
      <StyledModal isOpen={walletModalOpen} onDismiss={toggleWalletModal}>
        <Box mx="auto" my={5}>
          <Typography textAlign="center" mb={5}>
            Sign in with:
          </Typography>

          <Flex alignItems="stretch" justifyContent="space-between" mx={3}>
            {hasExtension ? (
              <WalletOption onClick={handleOpenWallet}>
                <IconexIcon width="50" height="50" />
                <Text>ICONex</Text>
              </WalletOption>
            ) : (
              <WalletOption
                as="a"
                href="https://chrome.google.com/webstore/detail/iconex/flpiciilemghbmfalicajoolhkkenfel?hl=en"
              >
                <IconexIcon width="50" height="50" />
                <Text>ICONex</Text>
              </WalletOption>
            )}

            <VerticalDivider text="or"></VerticalDivider>

            <WalletOption onClick={handleOpenLedger}>
              <LedgerIcon width="50" height="50" />
              <Text>Ledger</Text>
            </WalletOption>
          </Flex>

          <Typography mx={4} mt={6} textAlign="center">
            Use at your own risk. Money lost via liquidation or a smart contract bug cannot be recovered.
          </Typography>
        </Box>
      </StyledModal>

      <LedgerAddressList isOpen={showLedgerAddress} onDismiss={toggleShowledgerAddress}>
        <Flex flexDirection="column" alignItems="stretch" m={5} width="100%">
          <Typography textAlign="center" mb={3}>
            Choose a wallet from your Ledger:
          </Typography>
          <table className="wallet">
            <tbody>
              {addressList.map((address: any) => {
                return (
                  <tr
                    key={address.point}
                    onClick={() => {
                      chooseLedgerAddress({
                        address: address.address,
                        point: address.point,
                      });
                    }}
                  >
                    <td>{displayAddress(address.address)}</td>
                    <td>{address.balance} ICX</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <ul className="pagination">
            <li onClick={getBack}>˂</li>
            <li onClick={getNext}>˃</li>
          </ul>
        </Flex>
      </LedgerAddressList>
    </>
  );
}
