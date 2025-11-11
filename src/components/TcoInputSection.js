import React from 'react';
import { useAppContext } from '../context/AppContext';
import TimeframeSelector from './TimeframeSelector';
import CostInputCards from './CostInputCards';

const TcoInputSection = React.memo(() => {
  return (
    <>
      <TimeframeSelector />
      <CostInputCards />
    </>
  );
});

TcoInputSection.displayName = 'TcoInputSection';

export default TcoInputSection;
