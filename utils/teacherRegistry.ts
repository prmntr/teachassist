export type TeacherSearchResult = {
  id: string;
  name: string;
  status: string;
  firstCertified?: string;
  applicationType?: string;
  clientGuid?: string;
};

export type TeacherQualification = {
  subtitle?: string;
  id?: string;
  subject?: string;
  name?: string;
  institution?: string;
  date?: string;
  division?: string;
  type?: string;
  code?: string;
  option?: string;
  credentialType?: string;
  state?: string;
};

export type TeacherDetails = TeacherSearchResult & {
  degrees: TeacherQualification[];
  teaching: TeacherQualification[];
  additional: TeacherQualification[];
};

export const OCT_API_BASE =
  "https://apps.oct.ca/FindATeacherWebApiWrapper/api/publicregister";
export const OCT_GUID = "814fd225-0c8b-eb11-b1ac-000d3a09d306";
export const OCT_CSID = "f41uk_O3QGF1Mo0.tf_sTdl_EUedR6pksz";

const buildOctQuery = (params: Record<string, string>) =>
  Object.entries(params)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

export const buildTeacherSearchUrl = (query: string) =>
  `${OCT_API_BASE}/search?${buildOctQuery({
    parameter: query,
    csid: OCT_CSID,
  })}`;

const buildTeacherDetailsUrl = (
  endpoint: "basicQualification" | "degreeCredentials",
  id: string,
  clientGuid: string,
) =>
  `${OCT_API_BASE}/${endpoint}?${buildOctQuery({
    id,
    guid: clientGuid || OCT_GUID,
    csid: OCT_CSID,
    _: Date.now().toString(),
  })}`;

export const fetchOctJson = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json, text/plain, */*",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok || !contentType.toLowerCase().includes("json")) {
    throw new Error(
      `OCT registry returned ${response.status || "a non-JSON response"}.`,
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("OCT registry returned invalid JSON.");
  }
};

export const getString = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

export const formatTeacherName = (teacher: any) => {
  const fullName = getString(
    teacher.fullname1 ?? teacher.phoenix_fullname ?? teacher.fullname,
  );
  if (fullName) return fullName.replace(/,\s*OCT$/i, "").trim();

  const parts = [
    teacher.phoenix_firstname1 ?? teacher.phoenix_firstname,
    teacher.phoenix_middlename1 ?? teacher.phoenix_middlename,
    teacher.phoenix_surname1 ?? teacher.phoenix_surname,
  ].filter(Boolean);
  return parts.join(" ").replace(/,\s*OCT$/i, "").trim();
};

export const parseTeacherResults = (value: any): TeacherSearchResult[] => {
  if (!Array.isArray(value)) return [];

  return value.map((teacher) => ({
    id: getString(teacher.phoenix_regid1 ?? teacher.phoenix_regid),
    name: formatTeacherName(teacher),
    status: getString(
      teacher.phoenix_fullstatusdescriptionml1 ??
        teacher.phoenix_fullstatusdescriptionml ??
        teacher["cs.phoenix_fullstatusdescription"] ??
        teacher.status,
    ),
    firstCertified: getString(
      teacher.phoenix_firstcertified1 ?? teacher.phoenix_firstcertified,
    ),
    applicationType: getString(
      teacher.phoenix_currentapplicationtype1 ??
        teacher.phoenix_currentapplicationtype,
    ),
    clientGuid: getString(
      teacher["cs.phoenix_client"] ??
        teacher.phoenix_client ??
        teacher.phoenix_clientid,
    ),
  }));
};

export const formatTeacherDate = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const buildQualification = (item: any): TeacherQualification => ({
  id: getString(
    item.phoenix_id ?? item.phoenix_qualificationid ?? item.phoenix_credentialid,
  ),
  subject: getString(item.phoenix_subjectdescription ?? item.phoenix_subject),
  name: getString(item.phoenix_name),
  institution: getString(item.phoenix_institution_name),
  date: getString(item.phoenix_validfrom ?? item.phoenix_issueddate),
  division: getString(item.phoenix_division_name),
  type: getString(item.phoenix_qualificationtypename),
  code: getString(item.phoenix_code),
  option: getString(item.phoenix_optionname),
});

export const buildDegreeCredential = (item: any): TeacherQualification => ({
  id: getString(item.phoenix_id ?? item.phoenix_credentialid),
  subject: getString(item.phoenix_degree_name),
  name: getString(item.phoenix_degree_name),
  institution: getString(item.phoenix_institution_name),
  date: getString(item.phoenix_issueddate),
  type: "Degree Credential",
  credentialType: getString(item.phoenix_credentialtype),
  state: getString(item.statecode),
});

export const fetchTeacherDetails = async (
  teacher: TeacherSearchResult,
): Promise<TeacherDetails> => {
  const detailGuid = teacher.clientGuid ?? "";
  const [basicQualifications, degreeCredentials] = await Promise.all([
    fetchOctJson(
      buildTeacherDetailsUrl("basicQualification", teacher.id, detailGuid),
    ),
    fetchOctJson(
      buildTeacherDetailsUrl("degreeCredentials", teacher.id, detailGuid),
    ),
  ]);

  const details: TeacherDetails = {
    ...teacher,
    degrees: [],
    teaching: [],
    additional: [],
  };

  if (Array.isArray(basicQualifications)) {
    basicQualifications.forEach((item) => {
      const destination =
        item.phoenix_qualificationtypename === "Additional Qualification"
          ? details.additional
          : details.teaching;

      destination.push(buildQualification(item));
    });
  }

  const degreeCredentialItems = Array.isArray(degreeCredentials?.value)
    ? degreeCredentials.value
    : Array.isArray(degreeCredentials)
      ? degreeCredentials
      : [];

  if (degreeCredentialItems.length > 0) {
    degreeCredentialItems.forEach((item: any) => {
      details.degrees.push(buildDegreeCredential(item));
    });
  }

  return details;
};
