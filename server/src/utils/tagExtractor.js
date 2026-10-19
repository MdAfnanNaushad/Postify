/**
 * Utility to reliably extract and normalize hashtags from Markdown content.
 * Guarantees that hashtags inside fenced code blocks or inline code are ignored,
 * and markdown headings (e.g. '# Heading') are never matched as tags.
 */

function stripMarkdownCode(text) {
  if (!text) return '';
  return text
    // Strip fenced code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Strip inline code blocks
    .replace(/`[^`\n]+`/g, ' ');
}

/**
 * Extracts normalized, unique lowercase tags from content.
 * e.g. "#React and #react" -> ["react"]
 */
function extractTags(text) {
  if (!text || typeof text !== 'string') return [];

  const stripped = stripMarkdownCode(text);

  // Match hashtags that are preceded by start of string or whitespace, followed by # and 2-30 alphanumeric/underscore/hyphen characters
  // Avoid markdown headings where # is followed by whitespace (# Title)
  const regex = /(?:^|\s)#([a-zA-Z0-9_-]{2,30})\b/g;
  const tagsSet = new Set();
  let match;

  while ((match = regex.exec(stripped)) !== null) {
    const rawTag = match[1];
    // Reject pure numbers like #123 if desired, or keep alphanumeric
    if (rawTag && rawTag.trim()) {
      tagsSet.add(rawTag.trim().toLowerCase());
    }
  }

  // Enforce reasonable limit (max 10 tags per post)
  return Array.from(tagsSet).slice(0, 10);
}

module.exports = {
  extractTags,
  stripMarkdownCode
};
