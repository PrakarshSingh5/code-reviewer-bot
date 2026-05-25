import { Severity, ReviewComment, RepoConfig } from '../types';

// Inline the filter logic to test it without mocking the entire Anthropic SDK
function filterComments(
  rawComments: ReviewComment[],
  config: Partial<RepoConfig>,
): ReviewComment[] {
  const SEVERITY_RANK: Record<Severity, number> = {
    bug: 0,
    security: 1,
    suggestion: 2,
    nitpick: 3,
  };

  const minRank = SEVERITY_RANK[config.min_severity ?? 'suggestion'] ?? 2;
  const maxComments = config.max_comments ?? 10;

  return rawComments
    .filter((c) => {
      const rank = SEVERITY_RANK[c.severity];
      return rank !== undefined && rank <= minRank;
    })
    .slice(0, maxComments);
}

describe('filterComments', () => {
  const makeComment = (severity: Severity, file = 'a.ts', line = 1): ReviewComment => ({
    file,
    line,
    severity,
    comment: `Test comment (${severity})`,
  });

  it('includes bug and security when min_severity is suggestion', () => {
    const input: ReviewComment[] = [
      makeComment('bug'),
      makeComment('security'),
      makeComment('suggestion'),
      makeComment('nitpick'),
    ];
    const result = filterComments(input, { min_severity: 'suggestion' });
    expect(result.map((c) => c.severity)).toEqual(['bug', 'security', 'suggestion']);
  });

  it('includes only bug and security when min_severity is security', () => {
    const input: ReviewComment[] = [
      makeComment('bug'),
      makeComment('security'),
      makeComment('suggestion'),
    ];
    const result = filterComments(input, { min_severity: 'security' });
    expect(result.map((c) => c.severity)).toEqual(['bug', 'security']);
  });

  it('caps results at max_comments', () => {
    const input: ReviewComment[] = Array.from({ length: 20 }, (_, i) =>
      makeComment('bug', `file${i}.ts`, i),
    );
    const result = filterComments(input, { min_severity: 'nitpick', max_comments: 5 });
    expect(result).toHaveLength(5);
  });

  it('returns empty array when no comments match', () => {
    const input: ReviewComment[] = [makeComment('nitpick')];
    const result = filterComments(input, { min_severity: 'suggestion' });
    expect(result).toHaveLength(0);
  });
});
