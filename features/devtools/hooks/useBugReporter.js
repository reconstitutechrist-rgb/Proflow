import { useBugReporter as useBugReporterFromProvider } from '../BugReporterProvider';

// Re-export the hook from the provider for convenience
export const useBugReporter = useBugReporterFromProvider;

export default useBugReporter;
