export interface ResultLine {
  line: string;
  message: string | null;
  isMet: boolean;
  isValid: boolean;
  wasReached: boolean;
  isSupported: boolean;
}
