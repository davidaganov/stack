export type BuildMode = "recommended" | "custom" | "empty"
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun"

export interface Feature {
  value: string
  label: string
  default?: boolean
}

export interface Template {
  label: string
  features: Feature[]
}

export interface ProjectAnswers {
  templateName: string
  projectName: string
  buildMode: BuildMode
  features: string[]
  install: boolean
  packageManager?: PackageManager
}

export interface GenerateOptions {
  stackRoot: string
  templateName: string
  projectName: string
  targetDir: string
  buildMode: BuildMode
  optionalFeatures: string[]
  install: boolean
  packageManager?: PackageManager
  quiet?: boolean
}

export interface ResolvedSource {
  sourcePath: string
  tmpDir: string | null
}

export interface PatchOperation {
  file: string
  action:
    | "replace"
    | "replace-entire"
    | "replace-marker"
    | "insert-before"
    | "insert-before-marker"
    | "insert-after"
    | "insert-after-marker"
  target?: string
  marker?: string
  content?: string
  lines?: string[]
  optional?: boolean
}

export interface FeaturePatch {
  requires?: string[]
  copy?: string[]
  remove?: string[]
  patches?: PatchOperation[]
  packageJson?: {
    dependencies?: string[]
    devDependencies?: string[]
    scripts?: Record<string, string>
  }
}
