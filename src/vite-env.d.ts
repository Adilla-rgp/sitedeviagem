/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Endereço da planner-api, por exemplo http://localhost:8000. Sem ela, modo demonstração. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
