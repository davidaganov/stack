export type BuildMode = "recommended" | "custom" | "empty"
export type TemplateArchitecture = "flat" | "layered"
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun"

export interface Feature {
  value: string
  label: string
  default?: boolean
}

export interface ArchitectureOption {
  value: TemplateArchitecture
  label: string
}

export interface DemoPagesFeatureConfig {
  flat: string
  layered: string
}

export interface FeatureOrderRule {
  after: string[]
  before: string[]
}

export interface AutoFeatureRule {
  feature: string
  when: {
    mode?: BuildMode
    allOf?: string[]
  }
}

export interface Template {
  label: string
  docsUrl?: string
  genScript?: string
  repoUrl?: string
  contentRoot?: string
  architectures?: ArchitectureOption[]
  features: Feature[]
  demoPagesFeature?: string | DemoPagesFeatureConfig
  featureOrder?: FeatureOrderRule[]
  applyTailwindLast?: boolean
  autoFeatures?: AutoFeatureRule[]
  layeredAppAllowlist?: string[]
}

export interface ProjectAnswers {
  templateName: string
  projectName: string
  buildMode: BuildMode
  architecture?: TemplateArchitecture
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
  architecture?: TemplateArchitecture
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
  name?: string
  requires?: string[]
  copyContentRoot?: boolean
  copy?: string[]
  remove?: string[]
  patches?: PatchOperation[]
  packageJson?: {
    dependencies?: string[]
    devDependencies?: string[]
    scripts?: Record<string, string>
  }
}

export type FeatureAliases = Record<string, string>
