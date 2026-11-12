import type {
  ApplicationStatus,
  CaregiverSortBy,
  CareSpecialty,
  ContactRequestStatus,
  DayOfWeek,
  DocumentType,
  HistoryStatusFilter,
  JobOfferStatus,
  ShiftType,
  UserRole,
  VerificationStatus,
} from "./types";

export const AUTH_COOKIE_NAME = "cc_token";
export const AUTH_TOKEN_STORAGE_KEY = "cc_token";
export const AUTH_USER_STORAGE_KEY = "cc_user";
export const PENDING_2FA_STORAGE_KEY = "cc_pending_2fa";
export const ADMIN_USER_REGISTRY_KEY = "cc_admin_user_registry";

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const PASSWORD_REQUIREMENTS = [
  { id: "length", label: "Mínimo 8 caracteres", test: (v: string) => v.length >= 8 },
  { id: "upper", label: "Al menos 1 letra mayúscula", test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", label: "Al menos 1 letra minúscula", test: (v: string) => /[a-z]/.test(v) },
  { id: "digit", label: "Al menos 1 número", test: (v: string) => /\d/.test(v) },
] as const;

export const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  CLIENT: "/client/dashboard",
  CAREGIVER: "/caregiver/dashboard",
  ADMIN: "/admin/dashboard",
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: "Familia / Cliente",
  CAREGIVER: "Cuidador Profesional",
  ADMIN: "Administrador",
};

export const CARE_SPECIALTY_LABELS: Record<CareSpecialty, string> = {
  ELDERLY_CARE: "Adulto Mayor",
  CHILD_CARE: "Cuidado Infantil",
  COGNITIVE_DISABILITY: "Discapacidad Cognitiva",
  PHYSICAL_DISABILITY: "Discapacidad Física",
};

export const CARE_SPECIALTY_DESCRIPTIONS: Record<CareSpecialty, string> = {
  ELDERLY_CARE:
    "Acompañamiento geriátrico, recordatorio de medicamentos, movilidad y cuidado diario en el hogar.",
  CHILD_CARE:
    "Cuidado infantil seguro, rutinas diarias, apoyo escolar y estimulación temprana.",
  COGNITIVE_DISABILITY:
    "Atención especializada en deterioro cognitivo, demencia, TEA y rutinas terapéuticas estructuradas.",
  PHYSICAL_DISABILITY:
    "Asistencia en movilidad reducida, transferencias seguras, soporte postural y rehabilitación diaria.",
};

export const CARE_SPECIALTY_OPTIONS: Array<{
  value: CareSpecialty;
  label: string;
  description: string;
}> = [
  {
    value: "ELDERLY_CARE",
    label: CARE_SPECIALTY_LABELS.ELDERLY_CARE,
    description: CARE_SPECIALTY_DESCRIPTIONS.ELDERLY_CARE,
  },
  {
    value: "CHILD_CARE",
    label: CARE_SPECIALTY_LABELS.CHILD_CARE,
    description: CARE_SPECIALTY_DESCRIPTIONS.CHILD_CARE,
  },
  {
    value: "COGNITIVE_DISABILITY",
    label: CARE_SPECIALTY_LABELS.COGNITIVE_DISABILITY,
    description: CARE_SPECIALTY_DESCRIPTIONS.COGNITIVE_DISABILITY,
  },
  {
    value: "PHYSICAL_DISABILITY",
    label: CARE_SPECIALTY_LABELS.PHYSICAL_DISABILITY,
    description: CARE_SPECIALTY_DESCRIPTIONS.PHYSICAL_DISABILITY,
  },
];

export const DAY_OF_WEEK_ORDER: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const WEEKDAYS_ORDER: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
];

export const WEEKEND_DAYS_ORDER: DayOfWeek[] = ["SATURDAY", "SUNDAY"];

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

export const DAY_OF_WEEK_SHORT_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Lun",
  TUESDAY: "Mar",
  WEDNESDAY: "Mié",
  THURSDAY: "Jue",
  FRIDAY: "Vie",
  SATURDAY: "Sáb",
  SUNDAY: "Dom",
};

export const MATRIX_SHIFT_TYPES: Array<"MORNING" | "AFTERNOON" | "NIGHT"> = [
  "MORNING",
  "AFTERNOON",
  "NIGHT",
];

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  MORNING: "Mañana",
  AFTERNOON: "Tarde",
  NIGHT: "Noche",
  FULL_TIME: "Jornada completa",
};

export const SHIFT_TYPE_SHORT_LABELS: Record<ShiftType, string> = {
  MORNING: "M",
  AFTERNOON: "T",
  NIGHT: "N",
  FULL_TIME: "JC",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  ID_CARD: "Cédula de Ciudadanía",
  CRIMINAL_RECORD: "Certificado de Antecedentes Judiciales",
  HEALTH_CERTIFICATE: "Certificado de Salud",
  ACADEMIC_DEGREE: "Título Académico / Certificación",
};

export const DOCUMENT_TYPE_OPTIONS: Array<{ value: DocumentType; label: string; requiredForBadge: boolean }> = [
  { value: "ID_CARD", label: DOCUMENT_TYPE_LABELS.ID_CARD, requiredForBadge: true },
  { value: "CRIMINAL_RECORD", label: DOCUMENT_TYPE_LABELS.CRIMINAL_RECORD, requiredForBadge: true },
  { value: "HEALTH_CERTIFICATE", label: DOCUMENT_TYPE_LABELS.HEALTH_CERTIFICATE, requiredForBadge: false },
  { value: "ACADEMIC_DEGREE", label: DOCUMENT_TYPE_LABELS.ACADEMIC_DEGREE, requiredForBadge: false },
];

export const REQUIRED_VERIFICATION_DOC_TYPES: DocumentType[] = [
  "ID_CARD",
  "CRIMINAL_RECORD",
];

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  PENDING: "En revisión",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

export const JOB_OFFER_STATUS_LABELS: Record<JobOfferStatus, string> = {
  OPEN: "Abierta",
  CLOSED: "Cerrada",
  CANCELLED: "Cancelada",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "En revisión",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
};

export const CONTACT_REQUEST_STATUS_LABELS: Record<ContactRequestStatus, string> = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
};

export const HISTORY_STATUS_LABELS: Record<HistoryStatusFilter, string> = {
  ALL: "Todos",
  SCHEDULED: "Programado",
  ONGOING: "En curso",
  COMPLETED: "Completado",
};

export const CAREGIVER_SORT_OPTIONS: Array<{ value: CaregiverSortBy; label: string }> = [
  { value: "rating_desc", label: "Mejor calificados" },
  { value: "price_asc", label: "Menor tarifa por hora" },
  { value: "price_desc", label: "Mayor tarifa por hora" },
  { value: "experience_desc", label: "Mayor experiencia" },
];

export const COLOMBIAN_CITIES = [
  "Bogotá",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Cartagena",
  "Bucaramanga",
  "Pereira",
  "Manizales",
  "Santa Marta",
  "Chía",
] as const;

export const MODALITY_REPORT_LABELS: Record<string, string> = {
  ELDERLY_CARE: "Adulto Mayor",
  CHILD_CARE: "Cuidado Infantil",
  DISABILITY_CARE: "Discapacidad (Cognitiva y Física)",
  "Elderly Care": "Adulto Mayor",
  "Child Care": "Cuidado Infantil",
  "Disability Support (Cognitive & Physical)": "Discapacidad (Cognitiva y Física)",
};

export const ROUTE_BREADCRUMB_LABELS: Record<string, string> = {
  client: "Portal Cliente",
  caregiver: "Portal Cuidador",
  admin: "Administración",
  dashboard: "Panel Principal",
  offers: "Mis Ofertas",
  create: "Publicar Oferta",
  applications: "Postulaciones",
  inquiries: "Solicitudes de Contacto",
  history: "Historial de Servicios",
  reviews: "Reseñas",
  new: "Nueva Reseña",
  settings: "Configuración",
  security: "Seguridad y 2FA",
  profile: "Mi Perfil Profesional",
  documents: "Documentos y Verificación",
  users: "Usuarios y Roles",
  reports: "Reportes de Modalidad",
};
