import { renderHook, act } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import { useTcoCalculation } from './useTcoCalculation';
import { useAppContext } from '../context/AppContext';

const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

describe('useTcoCalculation', () => {
  test('should calculate TCO correctly', () => {
    const { result } = renderHook(
      () => {
        const context = useAppContext();
        const tcoCalc = useTcoCalculation();
        return { context, tcoCalc };
      },
      { wrapper }
    );

    // Set up test data
    act(() => {
      result.current.context.actions.updateOnPremise({
        hardware: 1000,
        software: 500,
        maintenance: 300,
        labor: 2000,
        power: 400,
        cooling: 200,
        datacenter: 600,
      });
      result.current.context.actions.updateGcp({
        compute: 600,
        storage: 200,
        networking: 100,
        database: 300,
        monitoring: 50,
      });
      result.current.context.actions.updateMigration({
        assessment: 10000,
        tools: 5000,
        training: 8000,
        consulting: 15000,
      });
      result.current.context.actions.setTimeframe(36);
    });

    // Calculate TCO
    act(() => {
      result.current.tcoCalc.calculateTco();
    });

    const { tco, roi } = result.current.context.state;

    // Monthly on-premise: 5000 * 36 = 180,000
    expect(tco.onPremise).toBe(180000);

    // Monthly GCP: 1250 * 36 = 45,000
    expect(tco.gcp).toBe(45000);

    // Migration cost: 38,000
    expect(tco.migrationCost).toBe(38000);

    // Total GCP: 45,000 + 38,000 = 83,000
    expect(tco.totalGcp).toBe(83000);

    // ROI calculation
    const expectedRoi = ((180000 - 83000) / 83000) * 100;
    expect(roi.gcp).toBeCloseTo(expectedRoi, 1);
  });

  test('should handle zero costs', () => {
    const { result } = renderHook(
      () => {
        const context = useAppContext();
        const tcoCalc = useTcoCalculation();
        return { context, tcoCalc };
      },
      { wrapper }
    );

    act(() => {
      result.current.tcoCalc.calculateTco();
    });

    const { tco, roi } = result.current.context.state;

    expect(tco.onPremise).toBe(0);
    expect(tco.totalGcp).toBe(0);
    expect(roi.gcp).toBe(0);
  });

  test('should calculate ROI for all cloud providers', () => {
    const { result } = renderHook(
      () => {
        const context = useAppContext();
        const tcoCalc = useTcoCalculation();
        return { context, tcoCalc };
      },
      { wrapper }
    );

    act(() => {
      result.current.context.actions.updateOnPremise({ hardware: 1000 });
      result.current.context.actions.updateAws({ ec2: 700 });
      result.current.context.actions.updateAzure({ virtualMachines: 650 });
      result.current.context.actions.updateGcp({ compute: 600 });
      result.current.context.actions.setTimeframe(12);
    });

    act(() => {
      result.current.tcoCalc.calculateTco();
    });

    const { roi } = result.current.context.state;

    expect(roi.gcp).toBeGreaterThan(roi.azure);
    expect(roi.azure).toBeGreaterThan(roi.aws);
  });
});
