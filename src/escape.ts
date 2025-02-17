export const xmlReplacer = /["&'<>$\x80-\uFFFF]/g;

const xmlCodeMap = new Map([
    [34, "&quot;"],
    [38, "&amp;"],
    [39, "&apos;"],
    [60, "&lt;"],
    [62, "&gt;"],
]);

// For compatibility with node < 4, we wrap `codePointAt`
export const getCodePoint =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    String.prototype.codePointAt != null
        ? (str: string, index: number): number => str.codePointAt(index)!
        : // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
          (c: string, index: number): number =>
              (c.charCodeAt(index) & 0xfc00) === 0xd800
                  ? (c.charCodeAt(index) - 0xd800) * 0x400 +
                    c.charCodeAt(index + 1) -
                    0xdc00 +
                    0x10000
                  : c.charCodeAt(index);

/**
 * Encodes all non-ASCII characters, as well as characters not valid in XML
 * documents using XML entities.
 *
 * If a character has no equivalent entity, a
 * numeric hexadecimal reference (eg. `&#xfc;`) will be used.
 */
export function encodeXML(str: string): string {
    let ret = "";
    let lastIdx = 0;
    let match;

    while ((match = xmlReplacer.exec(str)) !== null) {
        const i = match.index;
        const char = str.charCodeAt(i);
        const next = xmlCodeMap.get(char);

        if (next !== undefined) {
            ret += str.substring(lastIdx, i) + next;
            lastIdx = i + 1;
        } else {
            ret += `${str.substring(lastIdx, i)}&#x${getCodePoint(
                str,
                i
            ).toString(16)};`;
            // Increase by 1 if we have a surrogate pair
            lastIdx = xmlReplacer.lastIndex += Number(
                (char & 0xfc00) === 0xd800
            );
        }
    }

    return ret + str.substr(lastIdx);
}

/**
 * Encodes all non-ASCII characters, as well as characters not valid in XML
 * documents using numeric hexadecimal reference (eg. `&#xfc;`).
 *
 * Have a look at `escapeUTF8` if you want a more concise output at the expense
 * of reduced transportability.
 *
 * @param data String to escape.
 */
export const escape = encodeXML;

function getEscaper(
    regex: RegExp,
    map: Map<number, string>
): (data: string) => string {
    return function escape(data: string): string {
        let match;
        let lastIdx = 0;
        let result = "";

        while ((match = regex.exec(data))) {
            if (lastIdx !== match.index) {
                result += data.substring(lastIdx, match.index);
            }

            // We know that this chararcter will be in the map.
            result += map.get(match[0].charCodeAt(0))!;

            // Every match will be of length 1
            lastIdx = match.index + 1;
        }

        return result + data.substring(lastIdx);
    };
}

/**
 * Encodes all characters not valid in XML documents using XML entities.
 *
 * Note that the output will be character-set dependent.
 *
 * @param data String to escape.
 */
export const escapeUTF8 = getEscaper(/[&<>'"]/g, xmlCodeMap);

/**
 * Encodes all characters that have to be escaped in HTML attributes,
 * following {@link https://html.spec.whatwg.org/multipage/parsing.html#escapingString}.
 *
 * @param data String to escape.
 */
export const escapeAttribute = getEscaper(
    /["&\u00A0]/g,
    new Map([
        [34, "&quot;"],
        [38, "&amp;"],
        [160, "&nbsp;"],
    ])
);

/**
 * Encodes all characters that have to be escaped in HTML text,
 * following {@link https://html.spec.whatwg.org/multipage/parsing.html#escapingString}.
 *
 * @param data String to escape.
 */
export const escapeText = getEscaper(
    /[&<>\u00A0]/g,
    new Map([
        [38, "&amp;"],
        [60, "&lt;"],
        [62, "&gt;"],
        [160, "&nbsp;"],
    ])
);
