import { ResponseDataWithReject } from './ResponseDataWithReject.ts';
import { ResponseDataWithResult } from './ResponseDataWithResult.ts';

export type ResponseData = ResponseDataWithReject | ResponseDataWithResult;
