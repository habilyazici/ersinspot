/**
 * servicing özellik modülü — genel sözleşme.
 */

export {
  servicingKeys,
  useAdminRequests,
  useAppointmentsOnDate,
  useConvertSellRequest,
  useCreateQuote,
  useRecordDiagnosis,
  useScheduleAppointment,
  useSetStaffNote,
  useUpdateRequestStatus,
  useCancelRequest,
  useCreateMovingRequest,
  useCreateSellRequest,
  useCreateTechnicalServiceRequest,
  useMyRequests,
  useRequest,
  useRespondToQuote,
} from './api.ts';

export type { CreateRequestResult } from './api.ts';

export { RequestInfo } from './request-info.tsx';
