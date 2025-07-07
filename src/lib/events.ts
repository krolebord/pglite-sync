export type MutationEvent = {
  id: string;
  type: "mutation";
  logicalTimestamp: number;
  physicalTimestamp: number;
  sessionId: string;
  payload: string;
};
