import { useState } from 'react';
import { formatCurrency, formatPercentage } from '../lib/ui';

export default function PoolsList({ pools = [] }) {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });

  const sortPools = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedPools = () => {
    if (!sortConfig.key) return pools;

    return [...pools].sort((a, b) => {
      let valueA, valueB;
      
      switch (sortConfig.key) {
        case 'pool':
          valueA = a.pool;
          valueB = b.pool;
          break;
        case 'balance':
          valueA = a.balance;
          valueB = b.balance;
          break;
        case 'pl24h':
          valueA = a.pl24h;
          valueB = b.pl24h;
          break;
        case 'apy24h':
          valueA = a.apy24h;
          valueB = b.apy24h;
          break;
        case 'fees24h':
          valueA = a.feesEarned;
          valueB = b.feesEarned;
          break;
        case 'status':
          valueA = a.inRange ? 1 : 0;
          valueB = b.inRange ? 1 : 0;
          break;
        case 'location':
          valueA = a.pool.includes('SOL') ? 'Orca' : 'Raydium';
          valueB = b.pool.includes('SOL') ? 'Orca' : 'Raydium';
          break;
        default:
          return 0;
      }
      
      if (typeof valueA === 'string') {
        return sortConfig.direction === 'asc' ? 
          valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      } else {
        return sortConfig.direction === 'asc' ? 
          valueA - valueB : valueB - valueA;
      }
    });
  };

  const getHeaderClassName = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc';
    }
    return '';
  };

  const sortedPools = getSortedPools();

  return (
    <section className="pools-section">
      <div className="section-header">
        <i className="fas fa-swimming-pool"></i>
        Your Pools
      </div>
      
      <div className="pool-table-container">
        <table className="pool-table">
          <thead>
            <tr>
              <th className={getHeaderClassName('pool')} onClick={() => sortPools('pool')}>
                Pool <i className="fas fa-sort"></i>
              </th>
              <th className={getHeaderClassName('balance')} onClick={() => sortPools('balance')}>
                Balance <i className="fas fa-sort"></i>
              </th>
              <th className={getHeaderClassName('pl24h')} onClick={() => sortPools('pl24h')}>
                P&L (24h) <i className="fas fa-sort"></i>
              </th>
              <th className={getHeaderClassName('apy24h')} onClick={() => sortPools('apy24h')}>
                APY (24h) <i className="fas fa-sort"></i>
              </th>
              <th className={getHeaderClassName('fees24h')} onClick={() => sortPools('fees24h')}>
                Fees (24h) <i className="fas fa-sort"></i>
              </th>
              <th className={getHeaderClassName('status')} onClick={() => sortPools('status')}>
                Status <i className="fas fa-sort"></i>
              </th>
              <th className={getHeaderClassName('location')} onClick={() => sortPools('location')}>
                Location <i className="fas fa-sort"></i>
              </th>
            </tr>
          </thead>
        </table>
        
        <div id="poolsContainer">
          {sortedPools.length === 0 ? (
            <div className="loading-pools">
              <div className="loading"></div>
              <span>Connect wallet or enter address to view pools</span>
            </div>
          ) : (
            sortedPools.map((pool, index) => (
              <div key={index} className="pool-row fade-in">
                <table>
                  <tbody>
                    <tr>
                      <td>
                        <div className="token-pair">
                          <i className="fas fa-coins"></i>
                          {pool.pool}
                        </div>
                      </td>
                      <td><strong>{formatCurrency(pool.balance)}</strong></td>
                      <td>
                        <span className={pool.pl24h >= 0 ? 'success' : 'error'}>
                          {formatCurrency(pool.pl24h, 2)}
                        </span>
                      </td>
                      <td>{formatPercentage(pool.apy24h)}</td>
                      <td><span className="success">{formatCurrency(pool.feesEarned)}</span></td>
                      <td>
                        <span className={pool.inRange ? 'in-range' : 'out-range'}>
                          {pool.inRange ? 'In Range' : 'Out of Range'}
                        </span>
                      </td>
                      <td>
                        <a 
                          href={pool.pool.includes('SOL') ? 
                            'https://www.orca.so/portfolio' : 
                            'https://raydium.io/liquidity-pools/'}
                          className="location-link" 
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {pool.pool.includes('SOL') ? 'Orca' : 'Raydium'}
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
} 