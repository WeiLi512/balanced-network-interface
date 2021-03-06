import React from 'react';

import BigNumber from 'bignumber.js';
import _ from 'lodash';
import { BalancedJs } from 'packages/BalancedJs';
import { useIconReact } from 'packages/icon-react';
import { useDispatch, useSelector } from 'react-redux';

import bnJs from 'bnJs';
import { MINIMUM_ICX_AMOUNT_IN_WALLET } from 'constants/index';
import { useAllTransactions } from 'store/transactions/hooks';

import { AppState } from '..';
import { changeBalances, resetBalances } from './actions';

// #redux-step-5: define function get value of variable from store
export function useWalletBalances(): AppState['wallet'] {
  return useSelector((state: AppState) => state.wallet);
}

export function useWalletFetchBalances(account?: string | null) {
  const dispatch = useDispatch();
  const details = useBALNDetails();
  const stakedBalance: BigNumber = React.useMemo(() => details['Staked balance'] || new BigNumber(0), [details]);
  const unstakingBalance: BigNumber = React.useMemo(() => details['Unstaking balance'] || new BigNumber(0), [details]);

  const transactions = useAllTransactions();

  React.useEffect(() => {
    const fetchBalances = () => {
      if (account) {
        Promise.all([
          bnJs.ICX.balanceOf(account),
          bnJs.sICX.balanceOf(account),
          bnJs.bnUSD.balanceOf(account),
          bnJs.BALN.balanceOf(account),
        ]).then(result => {
          const [ICX, sICX, bnUSD, BALN] = result.map(v => BalancedJs.utils.toIcx(v));
          dispatch(
            changeBalances({
              ICX,
              sICX,
              bnUSD,
              BALN: BALN.minus(stakedBalance).minus(unstakingBalance),
              BALNstaked: stakedBalance,
              BALNunstaking: unstakingBalance,
            }),
          );
        });
      } else {
        dispatch(resetBalances());
      }
    };

    fetchBalances();
  }, [transactions, account, stakedBalance, unstakingBalance, dispatch]);
}

export const useBALNDetails = (): { [key in string]?: BigNumber } => {
  const { account } = useIconReact();
  const transactions = useAllTransactions();
  const [details, setDetails] = React.useState({});

  React.useEffect(() => {
    const fetchDetails = async () => {
      if (account) {
        const result = await bnJs.BALN.detailsBalanceOf(account);

        const temp = {};

        _.forEach(result, function (value, key) {
          if (key === 'Unstaking time (in microseconds)') temp[key] = new BigNumber(value);
          else temp[key] = BalancedJs.utils.toIcx(value);
        });

        setDetails(temp);
      }
    };

    fetchDetails();
  }, [account, transactions]);

  return details;
};

export const useHasEnoughICX = () => {
  const balances = useWalletBalances();
  return balances['ICX'].isGreaterThan(MINIMUM_ICX_AMOUNT_IN_WALLET);
};
