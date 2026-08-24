import { Document, Page, View, Text, StyleSheet, Svg, Circle } from '@react-pdf/renderer';
import { isPdfRtl, pdfLangStyle, tp } from '../../../templates/pdf/pdfFont';
import { roundScore } from '../../../utils/scoreDisplay';
import type {
  CVAnalysisResult,
  InterviewQA,
  ScoreDimension,
} from './CVAnalysisDashboard.types';

const PRIMARY = '#2a5c45';
const TEXT = '#1a1a18';
const MUTED = '#6b6b66';
const BORDER = '#e2e1dc';
const TINT = '#eef3f0';

const LEVELS = ['Fresh', 'Junior', 'Mid', 'Senior', 'Lead'];

const scoreStyle = (score: number): { color: string; label: string } => {
  if (score === 100) return { color: PRIMARY, label: 'Perfect' };
  if (score >= 75) return { color: PRIMARY, label: 'Excellent' };
  if (score >= 50) return { color: '#c25b1a', label: 'Average' };
  return { color: '#e65100', label: 'Needs Work' };
};

// A trailing percent sign is a bidi neutral, so in an Arabic line it detaches from its
// number and drifts to the far edge. Written ahead of the digits it reorders back into
// "100%" exactly where it belongs.
const percent = (value: number): string => (isPdfRtl() ? `%${value}` : `${value}%`);

const dimColor = (score: number): string => {
  if (score >= 80) return PRIMARY;
  if (score >= 50) return '#c25b1a';
  return '#b71c1c';
};

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10.5, color: TEXT, fontFamily: 'Helvetica', lineHeight: 1.45 },

  scoreCard: {
    flexDirection: 'row', alignItems: 'center', gap: 20,
    border: `1 solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 18,
  },
  ringWrap: { width: 96, height: 96, position: 'relative' },
  ringNumWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  // The score is always digits, so it takes the Latin font in every language. Cairo's
  // ascent sits far higher than Helvetica's, which drops its baseline ~10pt inside the
  // same line box and pushed the number off the centre of the ring in Arabic only.
  ringNum: { fontSize: 28, fontWeight: 700, textAlign: 'center', fontFamily: 'Helvetica-Bold' },
  chip: {
    alignSelf: 'flex-start', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8,
    marginBottom: 6,
  },
  chipText: { fontSize: 10, fontWeight: 700, textAlign: 'center' },
  cardHeading: { fontSize: 15, fontWeight: 700, marginBottom: 9, color: TEXT },
  cardText: { fontSize: 9.5, color: MUTED },
  roleChip: {
    alignSelf: 'flex-start', marginTop: 8, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8,
    border: `1 solid ${PRIMARY}`,
  },
  roleChipText: { fontSize: 9.5, color: PRIMARY, textAlign: 'center' },

  section: { marginTop: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: PRIMARY, marginBottom: 8 },

  levelBox: { border: `1 solid ${PRIMARY}`, backgroundColor: TINT, borderRadius: 12, padding: 12, marginTop: 16 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  levelMsg: { flex: 1, fontWeight: 700, color: PRIMARY, fontSize: 11 },
  fitBadge: { backgroundColor: PRIMARY, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  fitBadgeText: { color: '#fff', fontSize: 9, fontWeight: 700, textAlign: 'center' },

  stepper: { position: 'relative', flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 4, paddingHorizontal: 8 },
  stepLine: { position: 'absolute', top: 5, left: '10%', right: '10%', height: 3, backgroundColor: '#d8ded9' },
  stepFill: { position: 'absolute', top: 5, left: '10%', height: 3, backgroundColor: PRIMARY },
  step: { width: '20%', alignItems: 'center' },
  stepDot: { width: 12, height: 12, borderRadius: 6 },
  stepLabel: { marginTop: 4, fontSize: 8, textAlign: 'center' },

  dim: { marginBottom: 14 },
  dimRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dimName: { fontWeight: 700, fontSize: 10 },
  dimScore: { fontWeight: 700, fontSize: 10 },
  barBg: { height: 7, borderRadius: 4, backgroundColor: '#e9e8e3', marginBottom: 8 },
  barFill: { height: 7, borderRadius: 4 },
  detail: { flexDirection: 'row', marginTop: 4, paddingLeft: 4 },
  detailDot: { width: 8, fontSize: 9 },
  detailText: { flex: 1, fontSize: 9, color: MUTED },

  bullet: { flexDirection: 'row', marginBottom: 3 },
  bulletDot: { width: 10 },
  bulletText: { flex: 1 },

  improve: { marginBottom: 5 },
  improveTitle: { fontWeight: 700 },

  qaBlock: { marginBottom: 9 },
  question: { fontWeight: 700, marginBottom: 2 },
  answer: { color: '#333' },

  footer: { position: 'absolute', bottom: 20, left: 36, right: 36, fontSize: 8, color: '#9a9a95', textAlign: 'center' },
});

const Bullet = ({ children }: { children: string }) => (
  <View style={s.bullet}>
    <Text style={s.bulletDot}>•</Text>
    <Text style={s.bulletText}>{children}</Text>
  </View>
);

const List = ({ title, items, color }: { title: string; items: string[]; color: string }) =>
  items.length ? (
    <View style={s.section} wrap={false}>
      <Text style={[s.sectionTitle, { color }]}>{tp(title)}</Text>
      {items.map((it, i) => (
        <Bullet key={i}>{it}</Bullet>
      ))}
    </View>
  ) : null;

const LevelStepper = ({ level }: { level: string }) => {
  const idx = LEVELS.indexOf(level);
  const active = idx === -1 ? 0 : idx;
  return (
    <View style={s.stepper}>
      <View style={s.stepLine} />
      <View style={[s.stepFill, { width: `${(active / (LEVELS.length - 1)) * 80}%` }]} />
      {LEVELS.map((lvl, i) => {
        const done = i <= active;
        return (
          <View key={lvl} style={s.step}>
            <View style={[s.stepDot, { backgroundColor: done ? PRIMARY : '#fff', border: `1.5 solid ${done ? PRIMARY : '#c8ccc9'}` }]} />
            <Text style={[s.stepLabel, { color: i === active ? PRIMARY : MUTED, fontWeight: i === active ? 700 : 400 }]}>
              {tp(lvl)}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const Dimension = ({ dim }: { dim: ScoreDimension }) => {
  const color = dimColor(dim.score);
  return (
    <View style={s.dim} wrap={false}>
      <View style={s.dimRow}>
        <Text style={s.dimName}>{tp(dim.name)}</Text>
        <Text style={[s.dimScore, { color }]}>{dim.score}</Text>
      </View>
      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${Math.min(100, dim.score)}%`, backgroundColor: color }]} />
      </View>
      {(dim.details || []).map((d, i) => (
        <View key={i} style={s.detail}>
          <Text style={s.detailDot}>•</Text>
          <Text style={s.detailText}>{d}</Text>
        </View>
      ))}
    </View>
  );
};

interface Props {
  result: CVAnalysisResult;
  answers: InterviewQA[];
}

const AnalysisReportPdf = ({ result, answers }: Props) => {
  const { color, label } = scoreStyle(result.qualityScore);
  const lc = result.levelContext;
  const R = 42;
  const CIRC = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(100, result.qualityScore));

  return (
    <Document>
      <Page size="A4" style={[s.page, pdfLangStyle()]}>
        {/* Score card — mirrors the dashboard hero */}
        <View style={s.scoreCard}>
          <View style={s.ringWrap}>
            <Svg width={96} height={96} viewBox="0 0 96 96">
              <Circle cx={48} cy={48} r={R} fill="none" stroke="#e9e8e3" strokeWidth={6} />
              <Circle
                cx={48}
                cy={48}
                r={R}
                fill="none"
                stroke={color}
                strokeWidth={6}
                strokeLinecap="round"
                transform="rotate(-90 48 48)"
                strokeDasharray={`${(pct / 100) * CIRC} ${CIRC}`}
              />
            </Svg>
            <View style={s.ringNumWrap}>
              <Text style={[s.ringNum, { color }]}>{roundScore(result.qualityScore)}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={[s.chip, { backgroundColor: `${color}22` }]}>
              <Text style={[s.chipText, { color }]}>{tp(label)}</Text>
            </View>
            <Text style={s.cardHeading}>{tp('CV Quality Score')}</Text>
            <Text style={s.cardText}>
              {tp('This rates how well your CV is written and optimized — content, keywords, formatting, grammar and impact. It measures the document, not your skills. How well you match your chosen level is shown separately below. Aim for 75+.')}
            </Text>
            {result.matchJobTitle ? (
              <View style={s.roleChip}>
                <Text style={s.roleChipText}>{result.matchJobTitle}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Level fit */}
        {lc ? (
          <View style={s.levelBox} wrap={false}>
            <View style={s.levelRow}>
              <Text style={s.levelMsg}>{lc.message}</Text>
              {typeof lc.fit === 'number' ? (
                <View style={s.fitBadge}>
                  <Text style={s.fitBadgeText}>{`${tp('Level fit')}: ${percent(lc.fit)}`}</Text>
                </View>
              ) : null}
            </View>
            {lc.level ? <LevelStepper level={lc.level} /> : null}
            {lc.levelReasons && lc.levelReasons.length ? (
              <View style={{ marginTop: 6, marginBottom: 6 }}>
                <Text style={{ fontSize: 9.5, fontWeight: 700, color: TEXT, marginBottom: 2 }}>
                  {tp('Why you fit this level')}:
                </Text>
                {lc.levelReasons.map((reason, i) => (
                  <Bullet key={i}>{reason}</Bullet>
                ))}
              </View>
            ) : null}
            {lc.nextLevelTips.length ? (
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 9.5, fontWeight: 700, color: TEXT, marginBottom: 2 }}>
                  {lc.belowBar ? tp('To close the gap to') : tp('To level up to')} {tp(lc.nextLevel)}:
                </Text>
                {lc.nextLevelTips.map((tip, i) => (
                  <Bullet key={i}>{tip}</Bullet>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Score breakdown with per-dimension detail */}
        {result.dimensions?.length ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{tp('Score Breakdown')}</Text>
            {result.dimensions.map((dim, i) => (
              <Dimension key={i} dim={dim} />
            ))}
          </View>
        ) : null}

        {/* How to enhance */}
        {result.sectionsToImprove?.length ? (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>{tp('How to enhance')}</Text>
            {result.sectionsToImprove.map((sec, i) => (
              <View key={i} style={s.improve}>
                <Text>
                  <Text style={s.improveTitle}>{tp(sec.section)}: </Text>
                  {sec.suggestion}
                </Text>
                {sec.evidence.cvExcerpt ? <Text style={s.cardText}>{tp('CV excerpt')}: "{sec.evidence.cvExcerpt}"</Text> : null}
                {sec.evidence.jobRequirement ? <Text style={s.cardText}>{tp('Job requirement')}: "{sec.evidence.jobRequirement}"</Text> : null}
                <Text style={s.cardText}>{tp('Why it matters')}: {sec.evidence.rationale}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <List title="Strengths" items={result.positiveFeedback || []} color={PRIMARY} />
        <List title="Critical issues" items={result.negativeFeedback || []} color="#b71c1c" />
        <List title="Improvement opportunities" items={result.neutralFeedback || []} color="#c25b1a" />
        <List title="ATS notes" items={result.atsCheckerNotes || []} color={MUTED} />{/* titles localized inside List via tp */}

        {/* Interview Q&A */}
        {answers.length || result.interviewQuestions?.length ? (
          <View style={s.section} break>
            <Text style={s.sectionTitle}>{tp('Interview questions & answers')}</Text>
            {(answers.length
              ? answers
              : (result.interviewQuestions || []).map((q) => ({ question: q, answer: '' }))
            ).map((qa, i) => (
              <View key={i} style={s.qaBlock} wrap={false}>
                <Text style={s.question}>
                  {i + 1}. {qa.question}
                </Text>
                {qa.answer ? <Text style={s.answer}>{qa.answer}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        <Text style={s.footer} fixed>
          {tp('Generated by OverQualified')}
        </Text>
      </Page>
    </Document>
  );
};

export default AnalysisReportPdf;
