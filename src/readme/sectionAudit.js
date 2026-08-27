/**
 * Flags README sections that require a human's judgment rather than a diff —
 * License, Author, Contributing, Acknowledgements, Testing, Deployment.
 * The bot never writes content for these (that would mean guessing at things
 * only a person can decide), but it's still useful to flag when they're
 * missing so nothing gets silently skipped.
 */

const { parseReadme } = require('./parser');

const REQUIRED_SECTIONS = [
  { id: 'license',          label: 'License',                keywords: ['license', 'licence'] },
  { id: 'author',           label: 'Author / Contact',        keywords: ['author', 'contact', 'maintainer'] },
  { id: 'contributing',     label: 'Contributing Guidelines', keywords: ['contributing', 'contribution'] },
  { id: 'acknowledgements', label: 'Acknowledgements',        keywords: ['acknowledg', 'credits', 'thanks'] },
  { id: 'testing',          label: 'Testing',                 keywords: ['testing', 'tests'] },
  { id: 'deployment',       label: 'Deployment',              keywords: ['deployment', 'deploy'] },
];

/**
 * @param {string} readmeContent
 * @returns {{ id: string, label: string }[]} sections that appear to be missing
 */
function findMissingSections(readmeContent) {
  const { sections } = parseReadme(readmeContent);
  const titles = sections.map(s => s.title.toLowerCase());

  return REQUIRED_SECTIONS.filter(({ keywords }) =>
    !titles.some(title => keywords.some(kw => title.includes(kw)))
  ).map(({ id, label }) => ({ id, label }));
}

module.exports = { findMissingSections, REQUIRED_SECTIONS };