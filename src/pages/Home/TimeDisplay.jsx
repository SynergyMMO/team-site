import React, { useState, useMemo } from 'react';
import styles from './TimeDisplay.module.css';

// Timezones from GMT -12 to GMT +12
const TIMEZONES = Array.from({ length: 25 }, (_, i) => `GMT ${i - 12 >= 0 ? '+' : ''}${i - 12}`);

// Map IANA timezone offset to GMT string
function getUserGmtString() {
  const now = new Date();
  const offsetMin = now.getTimezoneOffset();
  const offsetHr = -offsetMin / 60;
  const gmt = `GMT ${offsetHr >= 0 ? '+' : ''}${offsetHr}`;
  return gmt;
}

// Each row: { label, period, startHour, cells: [cell for each tz] }
const PERIODS = [
  { label: 'Morning', period: 'morning', startHour: 13 },
  { label: 'Day', period: 'day', startHour: 14.75 },
  { label: 'Night', period: 'night', startHour: 17.25 },
  { label: 'Morning', period: 'morning', startHour: 19 },
  { label: 'Day', period: 'day', startHour: 20.75 },
  { label: 'Night', period: 'night', startHour: 23.15 },
  { label: 'Morning', period: 'morning', startHour: 1 },
  { label: 'Day', period: 'day', startHour: 2.75 },
  { label: 'Night', period: 'night', startHour: 5.15 },
  { label: 'Morning', period: 'morning', startHour: 7 },
  { label: 'Day', period: 'day', startHour: 8.75 },
  { label: 'Night', period: 'night', startHour: 11.15 },
];

// Helper to format hour as 4-digit string (e.g. 13.00 -> 1300, 1.15 -> 0115)
function formatHour(h) {
  const hour = Math.floor(h);
  const min = Math.round((h - hour) * 60);
  return `${hour.toString().padStart(2, '0')}${min.toString().padStart(2, '0')}`;
}

// Convert 4-digit 24-hour string (e.g. "2309") to 12-hour am/pm (e.g. "11:09pm")
function to12Hour(timeStr) {
  if (!/^[0-2][0-9][0-5][0-9]$/.test(timeStr)) return timeStr;
  let hour = parseInt(timeStr.slice(0, 2), 10);
  let min = timeStr.slice(2);
  const ampm = hour >= 12 ? 'pm' : 'am';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${min}${ampm}`;
}

// Build the table data: for each period row, for each timezone column, compute the time string
function buildTable() {
  // The first period starts at 13:00 in GMT -12, then each cell is +1h for each tz to the right
  return PERIODS.map((row, rowIdx) => {
    const cells = [];
    for (let tz = 0; tz < TIMEZONES.length; ++tz) {
      // Each cell is startHour + tz hours
      let hour = row.startHour + tz;
      if (hour >= 24) hour -= 24;
      cells.push(formatHour(hour));
    }
    return { ...row, cells };
  });
}


const tableData = buildTable();


export default function TimeDisplayTable() {
  const [showAll, setShowAll] = useState(false);
  const userGmt = useMemo(getUserGmtString, []);
  const userTzIdx = TIMEZONES.indexOf(userGmt);
  const visibleTimezones = showAll ? TIMEZONES : (userTzIdx !== -1 ? [TIMEZONES[userTzIdx]] : [TIMEZONES[12]]); // fallback to GMT+0

  return (
    <div className={styles['timedisplay-table-container']}>
      <h2 style={{textAlign:'center',marginBottom:'1rem'}}>In-Game Time Table by Timezone</h2>
      <div style={{textAlign:'center', marginBottom:'1rem'}}>
        <button
          className={styles['showAllBtn']}
          onClick={() => setShowAll(v => !v)}
        >
          {showAll ? 'Hide extra timezones' : 'Display all timezones'}
        </button>
        <div style={{marginTop:'0.5em', color:'#aaa', fontSize:'0.95em'}}>
          Showing: <b>{showAll ? 'All Timezones' : `${userGmt} (Your Timezone)`}</b>
        </div>
      </div>
      <div style={{overflowX:'auto'}}>
        <table className={styles['timedisplay-table']} style={{minWidth: showAll ? 1200 : 0}}>
          <thead>
            <tr>
              <th></th>
              {visibleTimezones.map(tz => (
                <th key={tz}>{tz}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, i) => (
              <tr key={i}>
                <td className={styles['hour-label'] + ' ' + styles[row.period]}>{row.label}</td>
                {visibleTimezones.map((tz, j) => {
                  const tzIdx = TIMEZONES.indexOf(tz);
                  return <td key={tz} className={styles[row.period]}>{to12Hour(row.cells[tzIdx])}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.95em', color: '#aaa', marginTop: '1.5rem', textAlign:'center' }}>
        Each row shows the in-game period and the corresponding in-game time for every timezone.<br/>
        Colors match Morning, Day, and Night periods. Read horizontally for your timezone.
      </p>
    </div>
  );
}
