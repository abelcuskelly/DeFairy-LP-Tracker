import { useState } from 'react';
import { formatCurrency, formatPercentage } from '../lib/ui';

export default function PortfolioStats({ metrics }) {
  const [expandedSections, setExpandedSections] = useState({
    pl: false,
    apy: false,
    fees: false
  });

  const toggleExpandable = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const outOfRangePercent = metrics.totalPools > 0 ? 
    ((metrics.outOfRangePools / metrics.totalPools) * 100).toFixed(1) : 0;

  return (
    <section className="portfolio-section">
      <div className="section-header">
        <i className="fas fa-chart-pie"></i>
        LP Portfolio
      </div>
      
      <div className="portfolio-stats">
        {/* Total Balance */}
        <div className="stat-card">
          <div className="stat-value" id="totalBalance">
            {formatCurrency(metrics.totalBalance)}
          </div>
          <div className="stat-label">Total Balance</div>
        </div>
        
        {/* Profit/Loss */}
        <div className="stat-card">
          <div className="stat-value" id="profitLoss">
            {formatCurrency(metrics.totalPL24h)}
          </div>
          <div className="stat-label">Profit/Loss (24h)</div>
          <div className={`expandable ${expandedSections.pl ? 'open' : ''}`} id="plExpandable">
            <div className="expandable-header" onClick={() => toggleExpandable('pl')}>
              <span>View Details</span>
              <i className="fas fa-chevron-down"></i>
            </div>
            <div className="expandable-content">
              <div className="time-period">
                <span>24 Hours:</span>
                <span className={metrics.totalPL24h >= 0 ? 'success' : 'error'} id="pl24h">
                  {metrics.totalPL24h >= 0 ? '+' : ''}{formatCurrency(metrics.totalPL24h)}
                </span>
              </div>
              <div className="time-period">
                <span>Week:</span>
                <span className="success" id="plWeek">+$0.00</span>
              </div>
              <div className="time-period">
                <span>Month:</span>
                <span className="success" id="plMonth">+$0.00</span>
              </div>
              <div className="time-period">
                <span>All Time:</span>
                <span className="success" id="plAllTime">+$0.00</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Average APY */}
        <div className="stat-card">
          <div className="stat-value" id="avgApy">
            {formatPercentage(metrics.avgAPY)}
          </div>
          <div className="stat-label">Average APY (24h)</div>
          <div className={`expandable ${expandedSections.apy ? 'open' : ''}`} id="apyExpandable">
            <div className="expandable-header" onClick={() => toggleExpandable('apy')}>
              <span>View Details</span>
              <i className="fas fa-chevron-down"></i>
            </div>
            <div className="expandable-content">
              <div className="time-period">
                <span>24 Hours:</span>
                <span id="apy24h">{formatPercentage(metrics.avgAPY)}</span>
              </div>
              <div className="time-period">
                <span>Week:</span>
                <span id="apyWeek">0.0%</span>
              </div>
              <div className="time-period">
                <span>Month:</span>
                <span id="apyMonth">0.0%</span>
              </div>
              <div className="time-period">
                <span>All Time:</span>
                <span id="apyAllTime">0.0%</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Fees Harvested */}
        <div className="stat-card">
          <div className="stat-value" id="feesHarvested">
            {formatCurrency(metrics.totalFeesToday)}
          </div>
          <div className="stat-label">Fees Harvested (24h)</div>
          <div className={`expandable ${expandedSections.fees ? 'open' : ''}`} id="feesExpandable">
            <div className="expandable-header" onClick={() => toggleExpandable('fees')}>
              <span>View Details</span>
              <i className="fas fa-chevron-down"></i>
            </div>
            <div className="expandable-content">
              <div className="time-period">
                <span>24 Hours:</span>
                <span className="success" id="fees24h">
                  {formatCurrency(metrics.totalFeesToday)}
                </span>
              </div>
              <div className="time-period">
                <span>Week:</span>
                <span className="success" id="feesWeek">$0.00</span>
              </div>
              <div className="time-period">
                <span>Month:</span>
                <span className="success" id="feesMonth">$0.00</span>
              </div>
              <div className="time-period">
                <span>All Time:</span>
                <span className="success" id="feesAllTime">$0.00</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Out of Range */}
        <div className="stat-card">
          <div className="stat-value" id="outOfRange">
            {metrics.outOfRangePools} / {metrics.totalPools}
          </div>
          <div className="stat-label" id="outOfRangeLabel">
            Out of Range ({outOfRangePercent}%)
          </div>
        </div>
        
        {/* Locations */}
        <div className="stat-card">
          <div className="stat-value">Locations</div>
          <div className="stat-label" id="locationsBreakdown">
            {metrics.totalPools === 0 ? (
              <div className="loading"></div>
            ) : (
              <LocationBreakdown pools={metrics.pools} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function LocationBreakdown({ pools }) {
  if (!pools || pools.length === 0) return null;

  const locations = {};
  
  pools.forEach(pool => {
    const location = pool.pool.includes('SOL') ? 'Orca' : 'Raydium';
    if (!locations[location]) {
      locations[location] = { balance: 0, count: 0 };
    }
    locations[location].balance += pool.balance;
    locations[location].count += 1;
  });
  
  return (
    <>
      {Object.entries(locations).map(([name, data], index) => {
        const url = name === 'Orca' ? 'https://www.orca.so/portfolio' : 'https://raydium.io/liquidity-pools/';
        return (
          <div key={index}>
            <a href={url} className="location-link" target="_blank" rel="noopener noreferrer">
              {name}
            </a>: {formatCurrency(data.balance)} ({data.count} pools)
            {index < Object.entries(locations).length - 1 && <br />}
          </div>
        );
      })}
    </>
  );
} 