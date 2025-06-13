declare global {
  interface Window {
    copyCode: (codeBlock: Element | null) => void;
    autoOpenedArtifacts: number[];
    artifactDataMap: Record<number, unknown>;
    toggleArtifactPane?: () => void;
  }
}

export {};