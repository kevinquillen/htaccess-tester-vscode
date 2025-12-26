import { TestRequest, TestResult } from '../model';
import { testHtaccess } from '../../http';
import { validateTestRequest } from '../../util/validation';

export class HtaccessTestService {
  async test(request: TestRequest): Promise<TestResult> {
    const validation = validateTestRequest(
      request.url,
      request.rules,
      request.serverVariables
    );

    if (!validation.valid) {
      throw new Error(validation.message);
    }

    return testHtaccess(request);
  }
}
