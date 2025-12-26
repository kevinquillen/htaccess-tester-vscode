import { TestRequest, TestResult } from '../model';
import { testHtaccess } from '../../http';
import { validateTestRequest } from '../../util/validation';

/**
 * Service for testing htaccess rules
 */
export class HtaccessTestService {
  /**
   * Test htaccess rules against a URL
   */
  async test(request: TestRequest): Promise<TestResult> {
    // Validate request
    const validation = validateTestRequest(
      request.url,
      request.rules,
      request.serverVariables
    );

    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Execute the test via HTTP client
    return testHtaccess(request);
  }
}
