import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { getDashboardSummary } from '../api/trends';

const { width: SCREEN_W } = Dimensions.get('window');

const THEME = {
  bg: '#F6F8FC',
  card: '#FFFFFF',
  text: '#101828',
  subText: '#667085',
  border: '#EAECF0',

  primary: '#1F6F8B',
  indigo: '#3F51B5',
  purple: '#9C27B0',
  green: '#2E7D32',
  red: '#C62828',
  orange: '#FF9800',
};

const PREVIOUS_LABEL = { week: 'สัปดาห์ที่แล้ว', month: 'เดือนที่แล้ว' };

const safeFixed = (v, d = 1) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '-';
  return Number(v).toFixed(d);
};

const formatChangeText = (change, period) => {
  if (change === null || change === undefined) return 'ยังไม่มีข้อมูลช่วงก่อนหน้า';
  const base = PREVIOUS_LABEL[period] || 'ช่วงก่อนหน้า';
  if (change > 0) return `ดีขึ้นจาก${base} +${change.toFixed(1)}`;
  if (change < 0) return `แย่ลงจาก${base} ${change.toFixed(1)}`;
  return `คงที่เทียบกับ${base}`;
};

const formatCompareMood = (myAvg, communityAvg) => {
  if (myAvg === undefined || communityAvg === undefined) return null;
  if (myAvg > communityAvg)
    return `อารมณ์คุณสูงกว่าค่าเฉลี่ยชุมชนเล็กน้อย (คุณ ${myAvg.toFixed(1)} / ชุมชน ${communityAvg.toFixed(1)})`;
  if (myAvg < communityAvg)
    return `อารมณ์คุณต่ำกว่าค่าเฉลี่ยชุมชนเล็กน้อย (คุณ ${myAvg.toFixed(1)} / ชุมชน ${communityAvg.toFixed(1)})`;
  return `อารมณ์คุณใกล้เคียงค่าเฉลี่ยชุมชน (${myAvg.toFixed(1)})`;
};

const getDominantBucketText = (distribution = []) => {
  if (!distribution.length) return '';
  const low =
    (distribution.find(d => d.score === 1)?.count || 0) +
    (distribution.find(d => d.score === 2)?.count || 0);
  const mid = distribution.find(d => d.score === 3)?.count || 0;
  const high =
    (distribution.find(d => d.score === 4)?.count || 0) +
    (distribution.find(d => d.score === 5)?.count || 0);

  const maxVal = Math.max(low, mid, high);
  if (maxVal === 0) return '';
  if (maxVal === high) return 'ผู้ใช้ส่วนใหญ่อยู่กลุ่มอารมณ์ค่อนข้างดี (4-5)';
  if (maxVal === mid) return 'ผู้ใช้ส่วนใหญ่อยู่กลุ่มอารมณ์ปานกลาง (3)';
  return 'ผู้ใช้จำนวนมากอยู่กลุ่มอารมณ์ค่อนข้างต่ำ (1-2)';
};

/* ----------------------------- UI Primitives ----------------------------- */

function Card({ title, iconName, iconBg, iconColor, children, rightSlot }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.cardHeadLeft}>
          <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} size={18} color={iconColor} />
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        {rightSlot ? <View>{rightSlot}</View> : null}
      </View>

      {children}
    </View>
  );
}

function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Segmented({ value, onChange, leftLabel, rightLabel, leftValue, rightValue }) {
  return (
    <View style={styles.segmentWrap}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onChange(leftValue)}
        style={[styles.segmentBtn, value === leftValue && styles.segmentBtnActive]}>
        <Text style={[styles.segmentText, value === leftValue && styles.segmentTextActive]}>
          {leftLabel}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onChange(rightValue)}
        style={[styles.segmentBtn, value === rightValue && styles.segmentBtnActive]}>
        <Text style={[styles.segmentText, value === rightValue && styles.segmentTextActive]}>
          {rightLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ChipList({ items = [], max = 6 }) {
  const list = items.slice(0, max);
  if (!list.length) return <Text style={styles.noDataText}>ไม่มีข้อมูล</Text>;

  return (
    <View style={styles.chipsWrap}>
      {list.map((it, idx) => {
        const emoji = it.emoji || it.label || it.tag || 'แท็ก';
        const count = it.count ?? 0;
        // Extract tag name/label if available
        const tagName = it.tag || it.label || '';
        return (
          <View key={`${emoji}-${idx}`} style={styles.chipContainer}>
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>{emoji}</Text>
              <Text style={styles.chipCount}>x {count}</Text>
            </View>
            {tagName && <Text style={styles.chipCaption}>{tagName}</Text>}
          </View>
        );
      })}
    </View>
  );
}

/* ----------------------------- Header Section ---------------------------- */

function Header({ period, setPeriod, offset, setOffset, displayPeriod }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>แนวโน้ม</Text>
      <Text style={styles.headerSubtitle}>สรุปของฉัน และสรุปของผู้ใช้ทั้งหมด</Text>

      <Segmented
        value={period}
        onChange={(v) => {
          setPeriod(v);
          setOffset(0);
        }}
        leftLabel="รายสัปดาห์"
        rightLabel="รายเดือน"
        leftValue="week"
        rightValue="month"
      />

      <View style={styles.periodNav}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setOffset(offset - 1)}
          style={styles.navBtn}>
          <Ionicons name="chevron-back" size={18} color="#475467" />
        </TouchableOpacity>

        <Text style={styles.periodText}>{displayPeriod}</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => offset < 0 && setOffset(offset + 1)}
          style={[styles.navBtn, offset >= 0 && styles.navBtnDisabled]}
          disabled={offset >= 0}>
          <Ionicons name="chevron-forward" size={18} color={offset >= 0 ? '#D0D5DD' : '#475467'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ------------------------------ Cards: My ------------------------------- */

function MyMoodCard({ data, period }) {
  if (!data || data.average === undefined || data.average === null) return null;

  const {
    average,
    positive_avg,
    negative_avg,
    trend_diff,
    logged_days,
    total_days,
    daily = [],
  } = data;

  const lastDaily = daily.slice(-7);
  const qualityText =
    logged_days !== undefined && total_days ? `บันทึกแล้ว ${logged_days} จาก ${total_days} วัน` : null;

  const chartData = useMemo(() => {
    if (!lastDaily.length) return null;
    return {
      labels: lastDaily.map(d => {
        const dt = new Date(d.date);
        return dt.getDate().toString();
      }),
      datasets: [{ data: lastDaily.map(d => d.score), strokeWidth: 2 }],
    };
  }, [lastDaily]);

  const chartConfig = useMemo(
    () => ({
      backgroundColor: THEME.card,
      backgroundGradientFrom: THEME.card,
      backgroundGradientTo: THEME.card,
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(31, 111, 139, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(71, 84, 103, ${opacity})`,
      propsForDots: { r: '4' },
      propsForBackgroundLines: { stroke: '#EEF2F6' },
    }),
    [],
  );

  return (
    <Card
      title="ภาพรวมอารมณ์ของฉัน"
      iconName="happy-outline"
      iconBg="#E0F7FA"
      iconColor={THEME.primary}>
      <View style={styles.metric3Row}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Overall</Text>
          <View style={styles.metricValueRow}>
            <Ionicons name="star" size={18} color="#F59E0B" style={styles.metricStar} />
            <Text style={styles.metricValue}>{safeFixed(average, 1)}</Text>
          </View>
          <Text style={styles.metricSub}>/ 5.0</Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Positive</Text>
          <View style={styles.metricValueRow}>
            <Ionicons name="star" size={18} color="#2E7D32" style={styles.metricStar} />
            <Text style={[styles.metricValue, { color: '#2E7D32' }]}>{safeFixed(positive_avg, 1)}</Text>
          </View>
          <Text style={styles.metricSub}>/ 5.0</Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Negative</Text>
          <View style={styles.metricValueRow}>
            <Ionicons name="star" size={18} color="#F59E0B" style={styles.metricStar} />
            <Text style={styles.metricValue}>{safeFixed(negative_avg, 1)}</Text>
          </View>
          <Text style={styles.metricSub}>/ 5.0</Text>
        </View>
      </View>

      {qualityText ? <Text style={styles.centerSubHint}>{qualityText}</Text> : null}
    </Card>
  );
}

function CompletionCard({ data }) {
  if (!data) return null;
  const { overall_rate, data: statusData = [], streak_best = 0 } = data;
  if (overall_rate === undefined && overall_rate !== 0) return null;

  const pct = overall_rate > 1 ? overall_rate : overall_rate * 100;
  const done = Math.round(pct);

  // Filter to show only 3 statuses: done, urgent, normal
  const statusOrder = ['done', 'urgent', 'normal'];
  const filteredStatus = statusData
    .filter(item => statusOrder.includes(item.status))
    .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));

  return (
    <Card
      title="วินัย / เป้าหมายของฉัน"
      iconName="checkbox"
      iconBg="#E8F5E9"
      iconColor={THEME.green}
      rightSlot={<Text style={styles.pill}>{done}%</Text>}>
      <View style={styles.bigCenterRow}>
        <Text style={styles.bigNumber}>{done}</Text>
        <Text style={styles.bigUnit}>%</Text>
        <Text style={styles.bigDesc}>ทำสำเร็จ</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.completionTrack}>
        <View style={[styles.completionFill, { width: `${done}%` }]} />
      </View>

      {/* Status breakdown - 3 statuses */}
      {filteredStatus && filteredStatus.length > 0 ? (
        <View style={styles.statusGrid}>
          {filteredStatus.map((item, idx) => (
            <View key={idx} style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: item.color }]} />
              <Text style={styles.statusLabel}>{item.label}</Text>
              <Text style={styles.statusCount}>{item.count}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.centerSubHint}>สถิติดีที่สุดทำครบติดต่อกัน {streak_best} วัน</Text>
    </Card>
  );
}

function LifeBalanceCard({ data }) {
  if (!data || !data.data) return null;

  const top4 = data.data.slice(0, 4);
  const pieData = top4.map(cat => ({
    name: cat.label,
    population: cat.percentage,
    color: cat.color,
    legendFontColor: '#475467',
    legendFontSize: 12,
  }));

  return (
    <Card
      title="สมดุลชีวิตของฉัน (Top 4)"
      iconName="pie-chart"
      iconBg="#FFF3E0"
      iconColor={THEME.orange}>
      {pieData.length ? (
        <View style={styles.pieWrap}>
          <PieChart
            data={pieData}
            width={SCREEN_W - 56}
            height={190}
            chartConfig={{
              backgroundColor: THEME.card,
              backgroundGradientFrom: THEME.card,
              backgroundGradientTo: THEME.card,
              color: () => '#000000',
              labelColor: () => '#000000',
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute
          />
        </View>
      ) : null}

      {top4.map((cat, idx) => (
        <View key={idx} style={styles.balanceRow}>
          <Text style={styles.balanceEmoji}>{cat.emoji}</Text>
          <View style={{ flex: 1 }}>
            <View style={styles.balanceTop}>
              <Text style={styles.balanceLabel}>{cat.label}</Text>
              <Text style={styles.balancePct}>{cat.percentage}%</Text>
            </View>
            <View style={styles.balanceTrack}>
              <View style={[styles.balanceFill, { width: `${cat.percentage}%`, backgroundColor: cat.color }]} />
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
}

function FactorsCard({ data, title, maxPerSide = 6 }) {
  if (!data) return null;
  const positive = data.positive || [];
  const negative = data.negative || [];
  if (!positive.length && !negative.length) return null;

  return (
    <Card
      title={title}
      iconName="pricetag"
      iconBg="#E3F2FD"
      iconColor="#2196F3">
      <View style={styles.twoCol}>
        <View style={styles.col}>
          <Text style={[styles.colTitle, { color: THEME.green }]}>พลังบวก (+)</Text>
          <ChipList items={positive} max={maxPerSide} />
        </View>

        <View style={styles.col}>
          <Text style={[styles.colTitle, { color: THEME.red }]}>พลังลบ (-)</Text>
          <ChipList items={negative} max={maxPerSide} />
        </View>
      </View>
    </Card>
  );
}

/* --------------------------- Cards: Community --------------------------- */

function CommunityMoodCard({ data, myAverage, period }) {
  if (!data || data.average === undefined || data.average === null) return null;

  const changeText = formatChangeText(data.trend_diff, period);
  const compareText = formatCompareMood(myAverage, data.average);

  return (
    <Card
      title="อารมณ์เฉลี่ยของชุมชน"
      iconName="people"
      iconBg="#E8F0FE"
      iconColor={THEME.indigo}>
      <View style={styles.bigCenterRow}>
        <Text style={[styles.bigNumber, { color: THEME.indigo }]}>{safeFixed(data.average, 1)}</Text>
        <Text style={styles.bigUnit}>/ 5.0</Text>
      </View>

      <Text style={styles.centerHint}>{changeText}</Text>
      <Text style={styles.centerSubHint}>ผู้ใช้ที่นำมาคำนวณ {data.user_count || 0} คน</Text>
      {compareText ? <Text style={styles.compareHint}>{compareText}</Text> : null}
    </Card>
  );
}

function MoodDistributionCard({ data }) {
  if (!data || !data.distribution || !data.distribution.length) return null;

  const dist = data.distribution;
  const total = data.total_entries || dist.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...dist.map(item => item.count), 1);
  const summary = getDominantBucketText(dist);

  // Aggregate for positive/neutral/negative
  const lowCount = (dist.find(d => d.score === 1)?.count || 0) + (dist.find(d => d.score === 2)?.count || 0);
  const midCount = dist.find(d => d.score === 3)?.count || 0;
  const highCount = (dist.find(d => d.score === 4)?.count || 0) + (dist.find(d => d.score === 5)?.count || 0);
  const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <Card
      title="การกระจายระดับอารมณ์ของผู้ใช้ทั้งหมด"
      iconName="stats-chart"
      iconBg="#F3E5F5"
      iconColor={THEME.purple}>
      <View style={styles.distWrap}>
        {dist.map(item => (
          <View key={item.score} style={styles.distRow}>
            <Text style={styles.distLabel}>{item.score}</Text>
            <View style={styles.distTrack}>
              <View
                style={[
                  styles.distFill,
                  { width: `${Math.max((item.count / maxCount) * 100, item.count > 0 ? 6 : 0)}%` },
                ]}
              />
            </View>
            <Text style={styles.distValue}>{item.count}</Text>
          </View>
        ))}
      </View>

      {/* Positive/Neutral/Negative summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: THEME.green }]} />
          <Text style={styles.summaryLabel}>พลังบวก</Text>
          <Text style={styles.summaryPct}>{pct(highCount)}%</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: THEME.indigo }]} />
          <Text style={styles.summaryLabel}>กลางๆ</Text>
          <Text style={styles.summaryPct}>{pct(midCount)}%</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: THEME.red }]} />
          <Text style={styles.summaryLabel}>พลังลบ</Text>
          <Text style={styles.summaryPct}>{pct(lowCount)}%</Text>
        </View>
      </View>

      <Text style={styles.centerSubHint}>รวม {total} รายการ</Text>
      {summary ? <Text style={styles.centerHint}>{summary}</Text> : null}
    </Card>
  );
}

/* ---------------------- Cards: Community Activity Patterns ---------------------- */

function HeatmapCard({ data }) {
  if (!data || !data.matrix || !Array.isArray(data.matrix) || data.matrix.length === 0) return null;

  const days = data.days || ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
  const matrix = data.matrix;
  const flat = matrix.flat().filter(v => typeof v === 'number');
  const maxVal = flat.length ? Math.max(...flat) : 1;

  const cols = 24; // แสดงทุกชั่วโมง 0-23
  const hoursLabel = Array.from({ length: cols }, (_, i) => `${i}`);

  const reduced = matrix.map(row => {
    return row.slice(0, 24); // ใช้ข้อมูลทุกชั่วโมง 0-23
  });

  // Compute cell size to avoid overflow: subtract gaps and left day column
  const GAP = 2;
  const LEFT_COL = 32;
  const CONTENT_W = SCREEN_W - 56; // card inner content width
  const availableW = CONTENT_W - LEFT_COL - GAP * (cols - 1);
  const cellSize = Math.max(8, Math.floor(availableW / cols));

  return (
    <Card
      title="Heatmap เวลา (ผู้ใช้ทั้งหมด)"
      iconName="time"
      iconBg="#EEF2FF"
      iconColor="#4F46E5">
      <View style={styles.hmHeader}>
        <View style={{ width: 32 }} />
        {hoursLabel.map((h, idx) => (
          <Text key={h} style={[styles.hmHour, { width: cellSize, marginRight: idx === cols - 1 ? 0 : GAP }]}>
            {h}
          </Text>
        ))}
      </View>

      <View style={styles.hmBody}>
        {reduced.map((row, rIdx) => (
          <View key={rIdx} style={styles.hmRow}>
            <Text style={styles.hmDay}>{days[rIdx] || ''}</Text>
            {row.map((val, cIdx) => {
              const intensity = maxVal > 0 ? val / maxVal : 0;
              const alpha = 0.12 + intensity * 0.54; // 0.12..0.66 (เข้มขึ้นเล็กน้อย)
              return (
                <View
                  key={`${rIdx}-${cIdx}`}
                  style={[
                    styles.hmCell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: `rgba(79, 70, 229, ${alpha})`,
                      marginRight: cIdx === cols - 1 ? 0 : GAP,
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>

      <Text style={styles.centerSubHint}>แกน X = ชั่วโมง (0-23), แกน Y = วันในสัปดาห์</Text>
    </Card>
  );
}

function PeakTimeCard({ data }) {
  if (!data) return null;

  const items = [
    { key: 'morning', label: 'เช้า', value: data.morning },
    { key: 'noon', label: 'กลางวัน', value: data.noon },
    { key: 'evening', label: 'เย็น', value: data.evening },
    { key: 'night', label: 'กลางคืน', value: data.night },
  ].filter(it => it.value !== undefined && it.value !== null);

  if (!items.length) return null;

  return (
    <Card
      title="ช่วงเวลายอดนิยมของกิจกรรม (ผู้ใช้ทั้งหมด)"
      iconName="pulse"
      iconBg="#ECFDF5"
      iconColor="#059669">
      {items.map(it => {
        const v = Math.min(Math.max(it.value, 0), 100);
        return (
          <View key={it.key} style={styles.peakRow}>
            <Text style={styles.peakLabel}>{it.label}</Text>
            <View style={styles.peakTrack}>
              <View style={[styles.peakFill, { width: `${v}%` }]} />
            </View>
            <Text style={styles.peakValue}>{Math.round(v)}%</Text>
          </View>
        );
      })}

      {data.summary ? <Text style={styles.centerHint}>{data.summary}</Text> : null}
    </Card>
  );
}

function CommunityCategoryMixCard({ data }) {
  if (!data) return null;

  const items = data.items
    ? data.items
    : Array.isArray(data.labels) && Array.isArray(data.values)
      ? data.labels.map((label, i) => ({ label, value: data.values[i] }))
      : [];

  const cleaned = items
    .filter(it => it && it.label && it.value !== undefined && it.value !== null)
    .slice(0, 6);

  if (!cleaned.length) return null;

  const chartData = {
    labels: cleaned.map(it => it.label),
    datasets: [{ data: cleaned.map(it => Number(it.value) || 0) }],
  };

  const chartConfig = {
    backgroundColor: THEME.card,
    backgroundGradientFrom: THEME.card,
    backgroundGradientTo: THEME.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(71, 84, 103, ${opacity})`,
    propsForBackgroundLines: { stroke: '#EEF2F6' },
  };

  return (
    <Card
      title="หมวดกิจกรรมยอดนิยมของชุมชน"
      iconName="layers"
      iconBg="#FFF7ED"
      iconColor="#F59E0B">
      <View style={styles.chartWrap}>
        <BarChart
          data={chartData}
          width={SCREEN_W - 56}
          height={230}
          chartConfig={chartConfig}
          fromZero
          showValuesOnTopOfBars
          style={styles.chart}
        />
      </View>
      <Text style={styles.centerSubHint}>สัดส่วนกิจกรรมตามหมวด (ผู้ใช้ทั้งหมด)</Text>
    </Card>
  );
}

/* --------------------------------- Screen -------------------------------- */

export default function TrendsScreen() {
  const [period, setPeriod] = useState('week');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const displayPeriod = useMemo(() => {
    const now = new Date();
    if (period === 'week') {
      if (offset === 0) return 'สัปดาห์นี้';
      if (offset === -1) return 'สัปดาห์ที่แล้ว';
      return `${Math.abs(offset)} สัปดาห์ก่อน`;
    }
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const monthNames = [
      'มกราคม',
      'กุมภาพันธ์',
      'มีนาคม',
      'เมษายน',
      'พฤษภาคม',
      'มิถุนายน',
      'กรกฎาคม',
      'สิงหาคม',
      'กันยายน',
      'ตุลาคม',
      'พฤศจิกายน',
      'ธันวาคม',
    ];
    return `${monthNames[d.getMonth()]} ${d.getFullYear() + 543}`;
  }, [period, offset]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDashboardSummary(period, offset);
      setData(result);
    } catch (error) {
      console.log('Error fetching trends:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, offset]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const myData = data?.me || data || {};
  const communityData = data?.community || {};

  const myMood = myData?.mood;
  const myCompletion = myData?.completion;
  const myLifeBalance = myData?.life_balance;
  const myMoodFactors = myData?.mood_factors;

  const communityMood = communityData?.mood;
  const communityDistribution = communityData?.mood_distribution;
  const communityFactors = communityData?.mood_factors;

  const activityPatterns = communityData?.activity_patterns || {};
  const heatmap = activityPatterns?.heatmap;
  const peakTime = activityPatterns?.peak_time;
  const categoryMix = activityPatterns?.category_mix;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>กำลังวิเคราะห์ข้อมูล...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIcon}>
          <Ionicons name="bar-chart" size={42} color={THEME.primary} />
        </View>
        <Text style={styles.emptyTitle}>ยังไม่มีข้อมูล</Text>
        <Text style={styles.emptySub}>บันทึกกิจกรรมและอารมณ์เพื่อดูสถิติ</Text>

        <TouchableOpacity activeOpacity={0.9} style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>ลองใหม่</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        period={period}
        setPeriod={setPeriod}
        offset={offset}
        setOffset={setOffset}
        displayPeriod={displayPeriod}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle>ข้อมูลของผู้ใช้งาน</SectionTitle>
        <MyMoodCard data={myMood} period={period} />
        <CompletionCard data={myCompletion} />
        <LifeBalanceCard data={myLifeBalance} />
        <FactorsCard data={myMoodFactors} title="ปัจจัยที่กระทบอารมณ์ของฉัน" maxPerSide={6} />

        <View style={styles.divider} />

        <SectionTitle>ข้อมูลของผู้ใช้ทั้งหมด</SectionTitle>
        <CommunityMoodCard data={communityMood} myAverage={myMood?.average} period={period} />
        <FactorsCard data={communityFactors} title="ปัจจัยอารมณ์ยอดนิยมของชุมชน" maxPerSide={5} />

        <View style={styles.divider} />

        <SectionTitle>แนวโน้มกิจกรรมของผู้ใช้ทั้งหมด</SectionTitle>
        <HeatmapCard data={heatmap} />
        <PeakTimeCard data={peakTime} />
        <CommunityCategoryMixCard data={categoryMix} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* --------------------------------- Styles -------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },

  header: {
    backgroundColor: THEME.card,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: THEME.primary, marginTop: 4 },
  headerSubtitle: { fontSize: 13, color: THEME.subText, marginTop: 6, marginBottom: 12 },

  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#F2F4F7',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  segmentBtnActive: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  segmentText: { fontSize: 14, fontWeight: '800', color: '#98A2B3' },
  segmentTextActive: { color: THEME.primary },

  periodNav: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  navBtnDisabled: { opacity: 0.45 },
  periodText: {
    marginHorizontal: 12,
    minWidth: 120,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '900',
    color: '#344054',
  },

  content: { padding: 16, paddingBottom: 40 },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.primary,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  divider: { height: 1, backgroundColor: THEME.border, marginVertical: 14 },

  card: {
    backgroundColor: THEME.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeadLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '900', color: THEME.text },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F2F4F7',
    borderWidth: 1,
    borderColor: THEME.border,
    fontSize: 12,
    fontWeight: '900',
    color: '#344054',
  },

  metric3Row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  metricBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#EAECF0',
    alignItems: 'center',
  },
  metricLabel: { fontSize: 12, color: '#667085', fontWeight: '900' },
  metricValueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metricStar: { marginRight: 4 },
  metricValue: { fontSize: 22, fontWeight: '900', color: THEME.text },
  metricSub: { marginTop: 2, fontSize: 12, fontWeight: '800', color: '#98A2B3' },

  centerHint: { textAlign: 'center', marginTop: 12, fontSize: 13, color: '#475467', fontWeight: '800' },
  centerSubHint: { textAlign: 'center', marginTop: 6, fontSize: 12, color: THEME.subText, fontWeight: '700' },
  compareHint: { textAlign: 'center', marginTop: 10, fontSize: 12, color: THEME.primary, fontWeight: '900' },

  chartWrap: { marginTop: 12, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#EEF2F6' },
  chart: { marginVertical: 0 },

  bigCenterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 10,
  },
  bigNumber: { fontSize: 46, fontWeight: '900', color: THEME.text, lineHeight: 52 },
  bigUnit: { marginLeft: 6, marginBottom: 10, fontSize: 14, fontWeight: '900', color: '#98A2B3' },
  bigDesc: { marginLeft: 8, marginBottom: 10, fontSize: 14, fontWeight: '900', color: '#667085' },

  pieWrap: { marginTop: 6, borderRadius: 14, overflow: 'hidden' },

  balanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  balanceEmoji: { fontSize: 18, width: 30 },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  balanceLabel: { fontSize: 13, fontWeight: '800', color: '#344054' },
  balancePct: { fontSize: 13, fontWeight: '900', color: '#475467' },
  balanceTrack: { height: 8, backgroundColor: '#EEF2F6', borderRadius: 6, overflow: 'hidden' },
  balanceFill: { height: '100%', borderRadius: 6 },

  // Completion card
  completionTrack: { 
    height: 12, 
    backgroundColor: '#EEF2F6', 
    borderRadius: 8, 
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 16,
  },
  completionFill: { 
    height: '100%', 
    backgroundColor: THEME.green, 
    borderRadius: 8,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 6,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.subText,
    marginBottom: 4,
  },
  statusCount: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.text,
  },

  twoCol: { flexDirection: 'row', gap: 12, marginTop: 12 },
  col: { flex: 1 },
  colTitle: { fontSize: 12, fontWeight: '900', marginBottom: 10 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chipContainer: {
    alignItems: 'center',
    gap: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 8,
  },
  chipLabel: { fontSize: 13, fontWeight: '900', color: '#344054' },
  chipCount: { fontSize: 12, fontWeight: '900', color: '#667085' },
  chipCaption: { fontSize: 11, fontWeight: '600', color: THEME.subText, textAlign: 'center', maxWidth: 70 },
  noDataText: { fontSize: 12, color: '#98A2B3', fontStyle: 'italic' },

  distWrap: { marginTop: 12 },
  distRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  distLabel: { width: 26, fontSize: 12, fontWeight: '900', color: '#344054' },
  distTrack: { flex: 1, height: 8, backgroundColor: '#EEF2F6', borderRadius: 6, overflow: 'hidden' },
  distFill: { height: '100%', backgroundColor: THEME.purple, borderRadius: 6 },
  distValue: { width: 34, textAlign: 'right', fontSize: 12, fontWeight: '900', color: '#667085' },

  // Summary chips for positive/neutral/negative
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, marginBottom: 6 },
  summaryItem: { alignItems: 'center' },
  summaryDot: { width: 12, height: 12, borderRadius: 6, marginBottom: 6 },
  summaryLabel: { fontSize: 11, fontWeight: '800', color: '#344054', marginBottom: 2 },
  summaryPct: { fontSize: 14, fontWeight: '900', color: '#1F2937' },

  hmHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 4 },
  hmHour: { textAlign: 'center', fontSize: 8, fontWeight: '800', color: '#667085' },
  hmBody: { marginTop: 2 },
  hmRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  hmDay: { width: 32, fontSize: 11, fontWeight: '800', color: '#344054' },
  hmCell: { borderRadius: 4, borderWidth: 0.5, borderColor: 'rgba(79,70,229,0.08)' },

  peakRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  peakLabel: { width: 70, fontSize: 13, fontWeight: '900', color: '#344054' },
  peakTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  peakFill: { height: '100%', backgroundColor: '#4F46E5' },
  peakValue: { width: 44, textAlign: 'right', fontSize: 12, fontWeight: '900', color: '#344054' },

  center: { flex: 1, backgroundColor: THEME.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 14, fontSize: 14, fontWeight: '800', color: THEME.subText },

  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: THEME.text },
  emptySub: { marginTop: 6, fontSize: 13, fontWeight: '700', color: THEME.subText, marginBottom: 16 },

  retryBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});
