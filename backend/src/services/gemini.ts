import logger from '../config/logger';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GeminiResponse {
    candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
    }>;
}

async function callGemini(prompt: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 256,
            },
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        logger.error('Gemini API error', { status: res.status, body: errText });
        throw new Error(`Gemini API returned ${res.status}`);
    }

    const data = (await res.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    return text;
}

// Devanagari Unicode block: U+0900–U+097F (includes chars, matras, nukta, anusvara, visarga, etc.)
const DEVANAGARI_RE = /[\u0900-\u097F]/;

/**
 * Extract only Devanagari text from a Gemini response.
 * Removes markdown formatting, English explanations, quotes, asterisks, etc.
 */
function extractDevanagari(raw: string): string {
    // Remove everything that is not a Devanagari character or whitespace
    const cleaned = raw.replace(/[^\u0900-\u097F\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned;
}

/**
 * Transliterate an English name to Hindi (Devanagari script).
 * Falls back to a basic phonetic map if the Gemini API is unavailable.
 */
export async function transliterateToHindi(englishName: string): Promise<string> {
    const prompt = `Task: Transliterate an Indian person's name from English to Devanagari script.

Input name: ${englishName}

Instructions:
- Output ONLY the Devanagari script characters for the name
- Do NOT include the English name, explanation, transliteration guide, quotes, asterisks, or any other text
- Do NOT use markdown formatting
- Output a single line with only Devanagari characters and spaces (for multi-word names)
- Use standard Hindi spelling conventions

Output:`;

    try {
        const result = await callGemini(prompt);
        const devanagari = extractDevanagari(result);
        // Only accept the result if it actually contains Devanagari characters
        if (devanagari && DEVANAGARI_RE.test(devanagari)) {
            return devanagari;
        }
        logger.warn('Gemini returned no Devanagari text, using phonetic fallback', { result });
    } catch (err) {
        logger.warn('Gemini unavailable for transliteration, using phonetic fallback', { error: (err as Error).message });
    }

    // Phonetic fallback: basic English→Devanagari character mapping
    return phoneticToHindi(englishName);
}

/** Phonetic English→Hindi fallback using proper consonant + matra rules. */
function phoneticToHindi(name: string): string {
    // Consonant clusters (2-char, checked first)
    const consonantPairs: Record<string, string> = {
        'bh': 'भ', 'ch': 'च', 'dh': 'ध', 'gh': 'घ', 'jh': 'झ', 'kh': 'ख',
        'ph': 'फ', 'sh': 'श', 'th': 'थ', 'tr': 'त्र', 'pr': 'प्र', 'kr': 'क्र',
        'gr': 'ग्र', 'br': 'ब्र', 'dr': 'द्र', 'nr': 'न्र', 'ny': 'ञ',
    };
    // Single consonants
    const consonants: Record<string, string> = {
        'b': 'ब', 'c': 'क', 'd': 'द', 'f': 'फ', 'g': 'ग', 'h': 'ह',
        'j': 'ज', 'k': 'क', 'l': 'ल', 'm': 'म', 'n': 'न', 'p': 'प',
        'q': 'क', 'r': 'र', 's': 'स', 't': 'त', 'v': 'व', 'w': 'व',
        'x': 'क्स', 'y': 'य', 'z': 'ज़',
    };
    // Independent vowels (used at start of word or after another vowel)
    const vowelIndep: Record<string, string> = {
        'aa': 'आ', 'ai': 'ऐ', 'au': 'औ', 'ee': 'ई', 'oo': 'ऊ', 'ou': 'औ',
        'a': 'अ', 'e': 'ए', 'i': 'इ', 'o': 'ओ', 'u': 'उ',
    };
    // Dependent vowel matras (used after a consonant)
    const vowelMatra: Record<string, string> = {
        'aa': 'ा', 'ai': 'ै', 'au': 'ौ', 'ee': 'ी', 'oo': 'ू', 'ou': 'ौ',
        'a': '', 'e': 'े', 'i': 'ि', 'o': 'ो', 'u': 'ु',
    };
    const isVowel = (ch: string) => 'aeiou'.includes(ch);

    const words = name.trim().split(/\s+/);
    return words.map(word => {
        let result = '';
        let i = 0;
        const s = word.toLowerCase();
        let lastWasConsonant = false;

        while (i < s.length) {
            // Try 2-char vowel
            const two = s.substring(i, i + 2);
            if (isVowel(s[i]) && vowelIndep[two]) {
                result += lastWasConsonant ? vowelMatra[two] : vowelIndep[two];
                lastWasConsonant = false;
                i += 2;
                continue;
            }
            // Try single vowel
            if (isVowel(s[i]) && vowelIndep[s[i]]) {
                result += lastWasConsonant ? vowelMatra[s[i]] : vowelIndep[s[i]];
                lastWasConsonant = false;
                i++;
                continue;
            }
            // Try 2-char consonant cluster
            if (consonantPairs[two]) {
                // If previous was a consonant with no vowel in between, add halant
                if (lastWasConsonant) result += '्';
                result += consonantPairs[two];
                lastWasConsonant = true;
                i += 2;
                continue;
            }
            // Single consonant
            if (consonants[s[i]]) {
                if (lastWasConsonant) result += '्';
                result += consonants[s[i]];
                lastWasConsonant = true;
                i++;
                continue;
            }
            // Unknown char — pass through
            result += s[i];
            lastWasConsonant = false;
            i++;
        }
        // If word ends on a consonant, add implicit halant for cleaner look
        // (Hindi words ending in consonant are common — the inherent 'a' is dropped)
        return result;
    }).join(' ');
}

/**
 * Suggest which class a student should be placed in based on their age and other details.
 */
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

    // Prefer progression from previous class when it is reasonable.
    let targetRank = expectedRankFromAge;
    if (previousRank !== null) {
        const progressed = previousRank + 1;
        if (Math.abs(progressed - expectedRankFromAge) <= 1) {
            targetRank = progressed;
        }
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
    if(findRealMatch) matchedName = findRealMatch;


    const reason = previousRank !== null && targetRank === previousRank + 1
        ? `Age ${age} years and previous class progression indicate ${matchedName}`
        : `Age ${age} years best matches ${matchedName} in your available classes`;

    return { suggested_class: matchedName, reason };
}

function calculateAge(dob: string): number {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

function expectedClassRankFromAge(age: number): number {
    if (age <= 3) return -3; // Nursery
    if (age === 4) return -2; // LKG
    if (age === 5) return -1; // UKG
    const cls = age - 5; // age 6 => class 1
    return Math.max(1, Math.min(12, cls));
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
    if (numeric) {
        const n = parseInt(numeric[0], 10);
        return Number.isFinite(n) ? n : null;
    }

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

export async function mapStudentImportHeaders(
    headers: string[],
    sampleRows: Array<Record<string, any>> = []
): Promise<Record<string, string | null>> {
    const fields = [
        'name', 'dob', 'gender', 'father_name', 'mother_name', 'father_phone', 'father_email',
        'address', 'city', 'state', 'pincode', 'aadhaar', 'category', 'religion', 'blood_group',
        'previous_school', 'previous_class', 'class_name', 'section_name', 'admission_date', 'sr_no',
    ];

    const fallback = heuristicHeaderMap(headers, fields);

    try {
        const preview = sampleRows.slice(0, 3).map((r, idx) => `Row${idx + 1}: ${JSON.stringify(r)}`).join('\n');

        const prompt = `You map spreadsheet headers to student import fields.

Available headers:
${headers.join(', ')}

    Sample rows:
    ${preview || 'No sample rows'}

Target fields:
${fields.join(', ')}

Rules:
- Return JSON only, no markdown.
- Output object keys must be exactly the target fields.
- Each value must be one of the available headers exactly as-is, or null.
- Prefer strict semantic matches.

Example output shape:
{"name":"Student Name","dob":"DOB","gender":"Gender","father_name":"Father Name","mother_name":null,...}`;

        const raw = await callGemini(prompt);
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
        logger.warn('Gemini unavailable for import header mapping, using heuristic fallback', { error: (err as Error).message });
        return fallback;
    }
}

function heuristicHeaderMap(headers: string[], fields: string[]): Record<string, string | null> {
    const normalized = headers.map((h) => ({ raw: h, key: normalizeHeader(h) }));

    const aliases: Record<string, string[]> = {
        name: ['name', 'studentname', 'student_name', 'fullname'],
        dob: ['dob', 'dateofbirth', 'birthdate'],
        gender: ['gender', 'sex'],
        father_name: ['fathername', 'father_name', 'fathersname', 'parentname'],
        mother_name: ['mothername', 'mother_name', 'mothersname'],
        father_phone: ['fatherphone', 'father_mobile', 'phone', 'mobile', 'contactnumber'],
        father_email: ['fatheremail', 'email', 'parentemail'],
        address: ['address', 'homeaddress'],
        city: ['city', 'town'],
        state: ['state', 'province'],
        pincode: ['pincode', 'pin', 'zipcode', 'postalcode'],
        aadhaar: ['aadhaar', 'aadhar', 'aadhaarnumber'],
        category: ['category', 'caste'],
        religion: ['religion'],
        blood_group: ['bloodgroup', 'blood_group'],
        previous_school: ['previousschool', 'lastschool', 'schoolprevious'],
        previous_class: ['previousclass', 'lastclass', 'priorclass'],
        class_name: ['class', 'classname', 'standard', 'grade'],
        section_name: ['section', 'sectionname'],
        admission_date: ['admissiondate', 'dateofadmission', 'doa'],
        sr_no: ['srno', 'sr_no', 'serialno', 'registerno'],
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
