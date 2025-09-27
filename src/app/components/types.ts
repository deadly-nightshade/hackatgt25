export interface MethodData {
  name: string;
  description?: string;
}

export interface ClassData {
  name: string;
  description?: string;
  methods?: MethodData[];
  nestedClass?: string;
  nestedExplanation?: string;
}

export interface FunctionData {
  name: string;
  signature: string;
  description?: string;
}

export interface DiagramData {
  title: string;
  file: string;
  summary: string;
  imports: string[];
  functions: {
    name: string;
    signature: string;
    description?: string;
  }[];
  classes: {
    name: string;
    description?: string;
  }[];
  constants?: string[];
  [key: string]: any; // 👈 allows any other keys
}

