/**
 * AI Service — uses Anthropic Claude API (claude-haiku-4-5) for:
 *   1. Intelligent Excel header → ERP field mapping during bulk import
 *   2. English name → Devanagari (Hindi) transliteration
 *   3. Class suggestion based on student age
 *
 * File is named gemini.ts for historical reasons; all exports remain identical
 * so nothing else in the codebase needs to change.
 *
 * ANTHROPIC_API_KEY must be set in the environment.
 */
import Anthropic from '@anthropic-ai/sdk';
import logger from '../config/logger';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

function getClient(): Anthropic {
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not configured');
    return new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

async function callClaude(prompt: string, maxTokens = 512): Promise<string> {
    const client = getClient();
    const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
    });
    const block = message.content[0];
    return block.type === 'text' ? block.text.trim() : '';
}

// ─── Devanagari / Hindi Transliteration ─────────────────────────────────────

const DEVANAGARI_RE = /[\u0900-\u097F]/;

function extractDevanagari(raw: string): string {
    return raw.replace(/[^\u0900-\u097F\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function transliterateToHindi(englishName: string): Promise<string> {
    const prompt = `Transliterate this Indian person's name from English to Devanagari script.

Name: ${englishName}

Rules:
- Output ONLY the Devanagari characters, nothing else
- No English, no explanation, no quotes, no markdown
- Single line with only Devanagari characters and spaces

Output:`;

    try {
        const result = await callClaude(prompt, 64);
        const devanagari = extractDevanagari(result);
        if (devanagari && DEVANAGARI_RE.test(devanagari)) return devanagari;
        logger.warn('Claude returned no Devanagari text, using phonetic fallback', { result });
    } catch (err) {
        logger.warn('Claude unavailable for transliteration, using phonetic fallback', { error: (err as Error).message });
    }
    return phoneticToHindi(englishName);
}

function phoneticToHindi(name: string): string {
    const consonantPairs: Record<string, string> = {
        'bh': 'भ', 'ch': 'च', 'dh': 'ध', 'gh': 'घ', 'jh': 'झ', 'kh': 'ख',
        'ph': 'फ', 'sh': 'श', 'th': 'थ', 'tr': 'त्र', 'pr': 'प्र', 'kr': 'क्र',
        'gr': 'ग्र', 'br': 'ब्र', 'dr': 'द्र', 'nr': 'न्र', 'ny': 'ञ',
    };
    const consonants: Record<string, string> = {
        'b': 'ब', 'c': 'क', 'd': 'द', 'f': 'फ', 'g': 'ग', 'h': 'ह',
        'j': 'ज', 'k': 'क', 'l': 'ल', 'm': 'म', 'n': 'न', 'p': 'प',
        'q': 'क', 'r': 'र', 's': 'स', 't': 'त', 'v': 'व', 'w': 'व',
        'x': 'क्स', 'y': 'य', 'z': 'ज़',
    };
    const vowelIndep: Record<string, string> = {
        'aa': 'आ', 'ai': 'ऐ', 'au': 'औ', 'ee': 'ई', 'oo': 'ऊ', 'ou': 'औ',
        'a': 'अ', 'e': 'ए', 'i': 'इ', 'o': 'ओ', 'u': 'उ',
    };
    const vowelMatra: Record<string, string> = {
        'aa': 'ा', 'ai': 'ै', 'au': 'ौ', 'ee': 'ी', 'oo': 'ू', 'ou': 'ौ',
        'a': '', 'e': 'े', 'i': 'ि', 'o': 'ो', 'u': 'ु',
    };
    const isVowel = (ch: string) => 'aeiou'.includes(ch);

    return name.trim().split(/\s+/).map(word => {
        let result = '';
        let i = 0;
        const s = word.toLowerCase();
        let lastWasConsonant = false;
        while (i < s.length) {
            const two = s.substring(i, i + 2);
            if (isVowel(s[i]) && vowelIndep[two]) {
                result += lastWasConsonant ? vowelMatra[two] : vowelIndep[two];
                lastWasConsonant = false; i += 2; continue;
            }
            if (isVowel(s[i]) && vowelIndep[s[i]]) {
                result += lastWasConsonant ? vowelMatra[s[i]] : vowelIndep[s[i]];
                lastWasConsonant = false; i++; continue;
            }
            if (consonantPairs[two]) {
                if (lastWasConsonant) result += '्';
                result += consonantPairs[two];
                lastWasConsonant = true; i += 2; continue;
            }
            if (consonants[s[i]]) {
                if (lastWasConsonant) result += '्';
                result += consonants[s[i]];
                lastWasConsonant = true; i++; continue;
            }
            result += s[i]; lastWasConsonant = false; i++;
        }
        return result;
    }).join(' ');
}

// ─── Class Suggestion ────────────────────────────────────────────────────────

export async function suggestClass(
    studentName: string,
    dob: string,
    previousSchool?: string,
    previousClass?: string,
    availableClasses?: string[]
): Promise<{ suggested_class: string; reason: string }> {
    void studentName;
    void previousSchool;

    const age = calculateAge(dob);
    const expectedRankFromAge = expectedClassRankFromAge(age);
    const previousRank = parseClassRank(previousClass || '');

    let targetRank = expectedRankFromAge;
    if (previousRank !== null) {
        const progressed = previousRank + 1;
        if (Math.abs(progressed - expectedRankFromAge) <= 1) targetRank = progressed;
    }

    const normalizedAvailable = (availableClasses || [])
        .map((name) => ({ name, rank: parseClassRank(name) }))
        .filter((c): c is { name: string; rank: number } => c.rank !== null);

    if (!normalizedAvailable.length) {
        return {
            suggested_class: labelForRank(targetRank),
            reason: `Suggested by age ${age} years using standard Indian admission mapping`,
        };
    }

    const best = normalizedAvailable
        .sort((a, b) => Math.abs(a.rank - targetRank) - Math.abs(b.rank - targetRank))[0];

    const mappedAvailableClasses = availableClasses || [];
    let matchedName = best.name;
    const findRealMatch = mappedAvailableClasses.find(c => {
        const clean = parseClassRank(c);
        return clean !== null && clean === best.rank;
    });
    if (findRealMatch) matchedName = findRealMatch;

    const reason = previousRank !== null && targetRank === previousRank + 1
        ? `Age ${age} years and previous class progression indicate ${matchedName}`
        : `Age ${age} years best matches ${matchedName} in your available classes`;

    return { suggested_class: matchedName, reason };
}

function calculateAge(dob: string): number {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function expectedClassRankFromAge(age: number): number {
    if (age <= 3) return -3;
    if (age === 4) return -2;
    if (age === 5) return -1;
    return Math.max(1, Math.min(12, age - 5));
}

function parseClassRank(raw: string): number | null {
    const v = String(raw || '').trim().toLowerCase();
    if (!v) return null;
    const cleaned = v.replace(/standard|std\.?|grade|class/g, '').trim();
    if (cleaned.includes('nursery')) return -3;
    if (cleaned === 'lkg' || cleaned.includes('lower kg') || cleaned.includes('lower kindergarten')) return -2;
    if (cleaned === 'ukg' || cleaned.includes('upper kg') || cleaned.includes('upper kindergarten') || cleaned === 'kg2') return -1;
    if (cleaned === 'kg' || cleaned === 'kg1') return -2;
    const numeric = cleaned.match(/\d+/);
    if (numeric) { const n = parseInt(numeric[0], 10); return Number.isFinite(n) ? n : null; }
    const romanMap: Record<string, number> = {
        i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6,
        vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12,
    };
    return romanMap[cleaned] ?? null;
}

function labelForRank(rank: number): string {
    if (rank === -3) return 'Nursery';
    if (rank === -2) return 'LKG';
    if (rank === -1) return 'UKG';
    return `Class ${rank}`;
}

// ─── AI Header Mapping ───────────────────────────────────────────────────────

/**
 * Map spreadsheet column headers to ERP student import fields using Claude AI.
 * Falls back to heuristic matching if ANTHROPIC_API_KEY is not set or API fails.
 */
export async function mapStudentImportHeaders(
    headers: string[],
    sampleRows: Array<Record<string, any>> = []
): Promise<Record<string, string | null>> {
    const fields = [
        'name', 'first_name', 'last_name',
        'dob', 'gender', 'blood_group',
        'father_name', 'mother_name',
        'father_phone', 'father_email',
        'guardian_phone',
        'address', 'city', 'state', 'pincode',
        'aadhaar', 'category', 'religion',
        'previous_school', 'previous_class',
        'class_name', 'section_name',
        'admission_date', 'admission_number',
        'roll_no', 'sr_no',
        'transport', 'hostel', 'bus_route',
    ];

    const fallback = heuristicHeaderMap(headers, fields);

    try {
        const preview = sampleRows.slice(0, 3)
            .map((r, idx) => `Row${idx + 1}: ${JSON.stringify(r)}`).join('\n');

        const prompt = `You are mapping spreadsheet column headers to student data fields for an Indian school ERP system.

Available headers from the uploaded file:
${headers.join(', ')}

Sample data rows:
${preview || 'No sample rows available'}

Target ERP fields to map:
${fields.join(', ')}

Field notes:
- "name" = full student name. If file has "First_Name" + "Last_Name" separately, map those to "first_name" and "last_name"; leave "name" as null
- "admission_number" = student admission ID / roll number assigned at admission
- "roll_no" = class roll number (a small number like 1-60)
- "father_phone" / "guardian_phone" = parent contact number
- "transport" = whether student uses school transport (yes/no/true/false)
- "hostel" = whether student is a boarder / hostel resident
- "bus_route" = transport route name/number

Rules:
- Return ONLY a JSON object, no markdown, no explanation
- Keys must be exactly the target field names listed above
- Values must be one of the available header strings exactly as-is, or null
- Map each header to at most one field (no reuse)

Output:`;

        const raw = await callClaude(prompt, 512);
        const stripped = raw.replace(/```(?:json)?/gi, '').trim();
        const jsonMatch = stripped.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return fallback;

        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        const headerSet = new Set(headers);
        const out: Record<string, string | null> = {};
        for (const key of fields) {
            const value = parsed[key];
            if (typeof value === 'string' && headerSet.has(value)) {
                out[key] = value;
            } else {
                out[key] = fallback[key] ?? null;
            }
        }
        return out;
    } catch (err) {
        logger.warn('Claude unavailable for import header mapping, using heuristic fallback', { error: (err as Error).message });
        return fallback;
    }
}

function heuristicHeaderMap(headers: string[], fields: string[]): Record<string, string | null> {
    const normalized = headers.map((h) => ({ raw: h, key: normalizeHeader(h) }));

    const aliases: Record<string, string[]> = {
        // ── Name variants ──────────────────────────────────────────────────
        name:             ['name', 'studentname', 'student_name', 'fullname', 'full_name', 'studentfullname'],
        first_name:       ['firstname', 'first_name', 'fname', 'givenname', 'given_name'],
        last_name:        ['lastname', 'last_name', 'lname', 'surname', 'familyname', 'family_name'],
        // ── Demographics ──────────────────────────────────────────────────
        dob:              ['dob', 'dateofbirth', 'date_of_birth', 'birthdate', 'birth_date', 'dob_date'],
        gender:           ['gender', 'sex'],
        blood_group:      ['bloodgroup', 'blood_group', 'bloodtype', 'blood_type'],
        category:         ['category', 'caste', 'socialcategory'],
        religion:         ['religion'],
        // ── Family ──────────────────────────────────────────────────────
        father_name:      ['fathername', 'father_name', 'fathersname', 'parentname', 'father'],
        mother_name:      ['mothername', 'mother_name', 'mothersname', 'mother'],
        father_phone:     ['fatherphone', 'father_phone', 'father_mobile', 'fathermobile', 'phone', 'mobile', 'contactnumber', 'contact_number', 'parentphone'],
        father_email:     ['fatheremail', 'father_email', 'parentemail', 'parent_email'],
        guardian_phone:   ['guardianphone', 'guardian_phone', 'guardianp', 'guardian_p', 'guardianmobile', 'guardian_mobile', 'emergencyphone'],
        // ── Address ──────────────────────────────────────────────────────
        address:          ['address', 'homeaddress', 'home_address', 'residentialaddress', 'permanent_address'],
        city:             ['city', 'town', 'district'],
        state:            ['state', 'province'],
        pincode:          ['pincode', 'pin', 'zipcode', 'zip', 'postalcode', 'postal_code'],
        // ── Identity ─────────────────────────────────────────────────────
        aadhaar:          ['aadhaar', 'aadhar', 'aadhaarnumber', 'aadhaar_no', 'aadhaarno', 'uid'],
        // ── Academic ─────────────────────────────────────────────────────
        previous_school:  ['previousschool', 'previous_school', 'lastschool', 'last_school', 'schoolprevious', 'prevschool'],
        previous_class:   ['previousclass', 'previous_class', 'lastclass', 'last_class', 'priorclass', 'prevclass'],
        class_name:       ['class', 'classname', 'class_name', 'standard', 'grade', 'std'],
        section_name:     ['section', 'sectionname', 'section_name', 'sec', 'division'],
        admission_date:   ['admissiondate', 'admission_date', 'dateofadmission', 'date_of_admission', 'doa', 'joiningdate', 'joining_date'],
        admission_number: ['admissionno', 'admission_no', 'admno', 'adm_no', 'admissionnumber', 'admission_number', 'studentid', 'student_id', 'admissionid', 'registration_no'],
        roll_no:          ['rollno', 'roll_no', 'rollnumber', 'roll_number', 'classroll', 'class_roll'],
        sr_no:            ['srno', 'sr_no', 'serialno', 'serial_no', 'registerno', 'register_no'],
        // ── Transport & Logistics ─────────────────────────────────────────
        transport:        ['transport', 'transportation', 'schoolbus', 'school_bus', 'usestransport'],
        hostel:           ['hostel', 'boarding', 'boarder', 'hostelresident', 'hostel_resident', 'isboarder'],
        bus_route:        ['busroute', 'bus_route', 'routename', 'route_name', 'route', 'busno', 'bus_no'],
    };

    const out: Record<string, string | null> = {};
    for (const f of fields) {
        const wants = aliases[f] || [f];
        const match = normalized.find((h) => wants.includes(h.key));
        out[f] = match?.raw ?? null;
    }
    return out;
}

function normalizeHeader(v: string): string {
    return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
