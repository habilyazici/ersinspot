/**
 * servicing özellik modülü — genel sözleşme.
 */

export {
  servicingKeys,
  useCancelRequest,
  useCreateMovingRequest,
  useCreateSellRequest,
  useCreateTechnicalServiceRequest,
  useMyRequests,
  useRequest,
  useRespondToQuote,
} from './api.ts';

export type { CreateRequestResult } from './api.ts';
