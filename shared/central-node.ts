import { validateSource } from "./document";

type CentralLabel = {
  label: string;
  start: number;
  end: number;
  plain: boolean;
};

const SHAPES = [
  ["((", "))"],
  ["[", "]"],
  ["(", ")"],
  ["{{", "}}"],
  ["))", "(("],
  [")", "("],
] as const;
const UNSUPPORTED_ROOT =
  "Não foi possível identificar um único nó central simples. Use uma raiz como root((Minha ideia)) e mantenha os ramos mais recuados.";

/** Locate only the root label's source span; all other bytes remain untouched. */
function locateCentralLabel(source: string): CentralLabel | null {
  if (validateSource(source) || /\r(?!\n)|[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u2028\u2029]/.test(source))
    return null;

  let offset = 0;
  const lines = source.split("\n").map((raw) => {
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    const record = { line, offset };
    offset += raw.length + 1;
    return record;
  });
  const meaningful = lines.filter(
    ({ line }) => line.trim() && !line.trimStart().startsWith("%%"),
  );
  if (!/^mindmap(?:[ \t]+%%.*)?$/.test(meaningful[0]?.line.trim() ?? "") || !meaningful[1])
    return null;

  const root = meaningful[1];
  if (/^[ \t]*[^\S \t]/.test(root.line)) return null;
  const indentation = root.line.match(/^[ \t]*/)![0].length;
  for (const { line } of meaningful.slice(2)) {
    // Class decorations do not create another node in the Mermaid grammar.
    if (line.trimStart().startsWith(":::")) continue;
    if (line.match(/^[ \t]*/)![0].length <= indentation) return null;
  }

  let content = root.line.trim();
  const commentIndex = content.indexOf("%%");
  if (commentIndex >= 0) {
    const beforeComment = content.slice(0, commentIndex).trimEnd();
    // A trailing comment is a separate lexer token only after a closed shape.
    if (!/[()[\]{}]/.test(beforeComment) || beforeComment.startsWith('"'))
      return null;
    content = beforeComment;
  }
  let start = root.offset + indentation;
  let body = content;
  let plain = true;
  const delimiterIndex = content.search(/[()[\]{}]/);
  // A quoted free-text label is also preserved byte-for-byte outside its text.
  if (!content.startsWith('"') && delimiterIndex >= 0) {
    const id = content.slice(0, delimiterIndex);
    if (!/^(?:[\p{L}\p{N}_][\p{L}\p{N}_.-]*)?[ \t]*$/u.test(id))
      return null;
    const shape = SHAPES.find(
      ([open, close]) =>
        content.startsWith(open, delimiterIndex) && content.endsWith(close),
    );
    if (!shape) return null;
    const [open, close] = shape;
    start += delimiterIndex + open.length;
    body = content.slice(delimiterIndex + open.length, -close.length);
    plain = false;
  }

  const leading = body.match(/^[ \t]*/)![0].length;
  const trailing = body.match(/[ \t]*$/)![0].length;
  start += leading;
  body = body.slice(leading, body.length - trailing);
  if (body.startsWith('"')) {
    if (!body.endsWith('"') || body.length < 2) return null;
    // Spaces outside a quoted shaped label would introduce extra lexer tokens.
    if (!plain && (leading || trailing)) return null;
    body = body.slice(1, -1);
    start += 1;
    if (/["`\\]/.test(body)) return null;
    if (plain && /[()[\]{}]/.test(body)) return null;
  } else if (/[()[\]{}"`\\]/.test(body)) {
    return null;
  }
  if (!body.trim() || /%%|::|;|[<>]/.test(body)) return null;
  if (plain && /^mindmap\b/i.test(body)) return null;
  return { label: body, start, end: start + body.length, plain };
}

/** Return null for flowcharts, missing roots, or root syntax the helper cannot safely edit. */
export function readCentralLabel(source: string): string | null {
  return locateCentralLabel(source)?.label ?? null;
}

/** Change a single root label without regenerating the Mermaid document. */
export function updateCentralLabel(source: string, label: string): string {
  if (/[\u0000-\u001f\u007f\u2028\u2029]/.test(label))
    throw new Error("O texto central deve ocupar uma única linha, sem caracteres de controle.");
  const text = label.trim();
  if (!text || text.length > 100)
    throw new Error("Use de 1 a 100 caracteres no texto central.");
  if (/[()[\]{}"`\\<>|;]/.test(text) || /%%|::|(?:[a-z][a-z\d+.-]*:\/\/|www\.|mailto:|javascript:|data:)/i.test(text))
    throw new Error("Use texto simples, sem HTML, URLs, aspas, barras invertidas ou delimitadores Mermaid como [](){}.");

  const root = locateCentralLabel(source);
  if (!root) throw new Error(UNSUPPORTED_ROOT);
  if (root.plain && /^mindmap\b/i.test(text))
    throw new Error('Uma raiz sem forma não pode começar com a palavra "mindmap". Use outro texto ou defina root((Texto)) no editor.');
  const updated = source.slice(0, root.start) + text + source.slice(root.end);
  const error = validateSource(updated);
  if (error) throw new Error(error);
  return updated;
}
