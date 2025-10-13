import React from 'react';
import Joyride from 'react-joyride';

const Tour = ({ run, steps }) => {
  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      showProgress
      showSkipButton
      styles={{
        options: {
          arrowColor: '#fff',
          backgroundColor: '#fff',
          primaryColor: '#007bff',
          textColor: '#333',
          width: 900,
          zIndex: 1000,
        }
      }}
    />
  );
};

export default Tour;
