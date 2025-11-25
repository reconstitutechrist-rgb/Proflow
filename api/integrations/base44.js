// Re-export dataClient for imports that expect it at this path
// This maintains backward compatibility with existing import patterns
import { dataClient } from '../base44Client';

export default dataClient;
export { dataClient, dataClient as base44 };
