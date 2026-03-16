/**
 * src/screens/TrendsScreen.js (หรือไฟล์ที่คุณใช้งานอยู่)
 * อัปเดต UX/UI: 
 * - ปรับการกระจาย Layout ให้ Clean & Modern
 * - ใช้ Icon ดาว (⭐) สำหรับ Positive/Negative
 * - ปรับ BarChart ไม่ให้แสดงจุดทศนิยม
 * - จัดระเบียบ ChipList (ปัจจัยอารมณ์) ให้เป็นระเบียบ
 */

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
import { PieChart, BarChart } from 'react-native-chart-kit';
import { getDashboardSummary } from '../api/trends'; // แก้ไข path ให้ตรงกับโปรเจกต์คุณ

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
  green: '#10B981', // ปรับเฉดเขียวให้ดู Modern ขึ้น
  red: '#EF4444',   // ปรับเฉดแดงให้ดู Modern ขึ้น
  orange: '#F59E0B',
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

function ChipList({ items = [], max = 6, isPositive }) {
  const list = items.slice(0, max);
  if (!list.length) return <Text style={styles.noDataText}>ไม่มีข้อมูล</Text>;

  // ใช้ดาว (⭐) เป็นไอคอนหลักตามที่ผู้ใช้ต้องการ แต่เปลี่ยนสีพื้นหลังให้เข้ากับบริบทบวก/ลบ
  const chipTheme = isPositive 
    ? { bg: '#ECFDF5', border: '#D1FAE5', text: THEME.green } 
    : { bg: '#FEF2F2', border: '#FEE2E2', text: THEME.red };

  return (
    <View style={styles.chipsWrap}>
      {list.map((it, idx) => {
        const count = it.count ?? 0;
        const tagName = it.tag || it.label || 'กิจกรรม';
        return (
          <View 
            key={`${idx}`} 
            style={[styles.chip, { backgroundColor: chipTheme.bg, borderColor: chipTheme.border }]}
          >
            <Text style={styles.chipEmoji}>⭐</Text>
            <Text style={[styles.chipLabel, { color: chipTheme.text }]}>{tagName}</Text>
            <View style={styles.chipBadge}>
              <Text style={styles.chipBadgeText}>{count}</Text>
            </View>
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

function MyMoodCard({ data }) {
  if (!data || data.average === undefined || data.average === null) return null;

  const {
    average,
    positive_avg,
    negative_avg,
    logged_days,
    total_days,
  } = data;

  const qualityText =
    logged_days !== undefined && total_days ? `บันทึกแล้ว ${logged_days} จาก ${total_days} วัน` : null;

  const positivePct = positive_avg !== undefined && positive_avg !== null ? (positive_avg / 5.0) * 100 : 0;
  const negativePct = negative_avg !== undefined && negative_avg !== null ? (negative_avg / 5.0) * 100 : 0;

  return (
    <Card
      title="ภาพรวมอารมณ์ของฉัน"
      iconName="happy-outline"
      iconBg="#E0F7FA"
      iconColor={THEME.primary}>
      {/* Overall Score */}
      <View style={styles.bigCenterRow}>
        <Text style={styles.bigNumber}>{safeFixed(average, 1)}</Text>
        <Text style={styles.bigUnit}>/ 5.0</Text>
      </View>
      
      {/* Positive/Negative Balance Bar */}
      <View style={styles.moodBalanceContainer}>
        <View style={styles.moodBalanceLabels}>
          <View style={styles.moodBalanceLabelItem}>
            <Text style={styles.moodEmojiStar}>⭐</Text>
            <Text style={styles.moodBalanceLabelText}>Positive</Text>
            <Text style={[styles.moodBalanceValue, { color: THEME.green }]}>{safeFixed(positive_avg, 1)}</Text>
          </View>
          <View style={styles.moodBalanceLabelItem}>
            <Text style={[styles.moodBalanceValue, { color: THEME.red }]}>{safeFixed(negative_avg, 1)}</Text>
            <Text style={styles.moodBalanceLabelText}>Negative</Text>
            <Text style={styles.moodEmojiStar}>⭐</Text>
          </View>
        </View>
        
        <View style={styles.moodBalanceBar}>
          <View style={[styles.moodBalancePositive, { width: `${positivePct}%` }]} />
          {/* ช่องว่างตรงกลางเพื่อความสวยงาม */}
          <View style={{ flex: 1, backgroundColor: '#F9FAFB' }} />
          <View style={[styles.moodBalanceNegative, { width: `${negativePct}%` }]} />
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

      <View style={styles.completionTrack}>
        <View style={[styles.completionFill, { width: `${done}%` }]} />
      </View>

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

      {/* <Text style={styles.centerSubHint}>สถิติดีที่สุดทำครบติดต่อกัน {streak_best} วัน</Text> */}
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
        <View style={styles.donutChartContainer}>
          <View style={styles.pieWrap}>
            <PieChart
              data={pieData}
              width={SCREEN_W - 56}
              height={200}
              chartConfig={{
                backgroundColor: THEME.card,
                backgroundGradientFrom: THEME.card,
                backgroundGradientTo: THEME.card,
                color: () => '#000000',
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="0"
              absolute
              hasLegend={false}
            />
          </View>
          <View style={styles.donutHole}>
            <Text style={styles.donutHoleText}>สมดุล</Text>
            <Text style={styles.donutHoleSubtext}>ชีวิต</Text>
          </View>
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
          <Text style={[styles.colTitle, { color: THEME.green }]}>พลังบวก (⭐)</Text>
          <ChipList items={positive} max={maxPerSide} isPositive={true} />
        </View>

        <View style={styles.col}>
          <Text style={[styles.colTitle, { color: THEME.red }]}>พลังลบ (⭐)</Text>
          <ChipList items={negative} max={maxPerSide} isPositive={false} />
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

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.moodEmojiStar}>⭐</Text>
          <Text style={styles.summaryLabel}>พลังบวก</Text>
          <Text style={[styles.summaryPct, { color: THEME.green }]}>{pct(highCount)}%</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>กลางๆ</Text>
          <Text style={styles.summaryPct}>{pct(midCount)}%</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>พลังลบ</Text>
          <Text style={[styles.summaryPct, { color: THEME.red }]}>{pct(lowCount)}%</Text>
          <Text style={styles.moodEmojiStar}>⭐</Text>
        </View>
      </View>

      <Text style={styles.centerSubHint}>รวม {total} รายการ</Text>
      {summary ? <Text style={styles.centerHint}>{summary}</Text> : null}
    </Card>
  );
}

function HeatmapCard({ data }) {
  if (!data || !data.matrix || !Array.isArray(data.matrix) || data.matrix.length === 0) return null;

  const days = data.days || ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const matrix = data.matrix;
  const flat = matrix.flat().filter(v => typeof v === 'number');
  const maxVal = flat.length ? Math.max(...flat) : 1;

  const cols = 24;
  const hoursLabel = Array.from({ length: cols }, (_, i) => `${i}`);

  const reduced = matrix.map(row => row.slice(0, 24));

  const GAP = 2;
  const LEFT_COL = 32;
  const CONTENT_W = SCREEN_W - 56;
  const availableW = CONTENT_W - LEFT_COL - GAP * (cols - 1);
  const cellSize = Math.max(8, Math.floor(availableW / cols));

  return (
    <Card
      title="Heatmap เวลา (ผู้ใช้ทั้งหมด)"
      iconName="time"
      iconBg="#EEF2FF"
      iconColor="#4F46E5">
      
      {/* Legend ที่อธิบายกราฟได้ชัดเจน */}
      <View style={styles.hmLegend}>
        <Text style={styles.hmLegendLabel}>ความหนาแน่นกิจกรรม:</Text>
        <View style={styles.hmLegendBar}>
          <View style={[styles.hmLegendCell, { backgroundColor: 'rgba(79, 70, 229, 0.12)' }]} />
          <View style={[styles.hmLegendCell, { backgroundColor: 'rgba(79, 70, 229, 0.30)' }]} />
          <View style={[styles.hmLegendCell, { backgroundColor: 'rgba(79, 70, 229, 0.50)' }]} />
          <View style={[styles.hmLegendCell, { backgroundColor: 'rgba(79, 70, 229, 0.80)' }]} />
        </View>
        <View style={styles.hmLegendLabels}>
          <Text style={styles.hmLegendText}>น้อย</Text>
          <Text style={styles.hmLegendText}>มาก</Text>
        </View>
      </View>

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
              const alpha = 0.12 + intensity * 0.68;
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
      title="ช่วงเวลายอดนิยมของกิจกรรม"
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
    decimalPlaces: 0, // ซ่อนจุดทศนิยมเพื่อให้ดูคลีน
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
  console.log('🎯 [DEBUG] TrendsScreen component mounted/rendered');
  
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
      'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
      'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
    ];
    return `${monthNames[d.getMonth()]} ${d.getFullYear() + 543}`;
  }, [period, offset]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('📊 [DEBUG] loadData called with period:', period, 'offset:', offset);
      const result = await getDashboardSummary(period, offset);
      console.log('📊 [DEBUG] Full Response:', result);
      console.log('📊 [DEBUG] result.me:', result?.me);
      console.log('📊 [DEBUG] result.me.mood:', result?.me?.mood);
      console.log('📊 [DEBUG] result.me.completion:', result?.me?.completion);
      console.log('📊 [DEBUG] result.me.mood.average:', result?.me?.mood?.average);
      console.log('📊 [DEBUG] result.me.completion.overall_rate:', result?.me?.completion?.overall_rate);
      setData(result);
    } catch (error) {
      console.log('❌ Error fetching trends:', error);
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
        <MoodDistributionCard data={communityDistribution} />
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: THEME.subText, fontWeight: '700' },
  
  // Header
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
  segmentBtnActive: { backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border },
  segmentText: { fontSize: 14, fontWeight: '800', color: '#98A2B3' },
  segmentTextActive: { color: THEME.primary },
  periodNav: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  navBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: THEME.border },
  navBtnDisabled: { opacity: 0.45 },
  periodText: { marginHorizontal: 12, minWidth: 120, textAlign: 'center', fontSize: 14, fontWeight: '900', color: '#344054' },

  // Content
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: THEME.primary, marginBottom: 12, letterSpacing: 0.2 },
  divider: { height: 1, backgroundColor: THEME.border, marginVertical: 14 },
  
  // Card
  card: { backgroundColor: THEME.card, borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: THEME.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardHeadLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBadge: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: THEME.text },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F2F4F7', borderWidth: 1, borderColor: THEME.border, fontSize: 12, fontWeight: '900', color: '#344054' },
  
  bigCenterRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginVertical: 8 },
  bigNumber: { fontSize: 36, fontWeight: '900', color: THEME.text },
  bigUnit: { fontSize: 16, fontWeight: '700', color: THEME.subText, marginLeft: 4 },
  bigDesc: { fontSize: 14, fontWeight: '700', color: THEME.subText, marginLeft: 8 },

  // Mood Balance
  moodBalanceContainer: { marginTop: 8, marginBottom: 8 },
  moodBalanceLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  moodBalanceLabelItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moodEmojiStar: { fontSize: 12 },
  moodBalanceLabelText: { fontSize: 12, fontWeight: '700', color: THEME.subText },
  moodBalanceValue: { fontSize: 16, fontWeight: '900' },
  moodBalanceBar: { flexDirection: 'row', height: 12, borderRadius: 999, overflow: 'hidden', backgroundColor: '#F9FAFB' },
  moodBalancePositive: { height: '100%', backgroundColor: THEME.green, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  moodBalanceNegative: { height: '100%', backgroundColor: THEME.red, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },

  centerHint: { textAlign: 'center', marginTop: 12, fontSize: 13, color: '#475467', fontWeight: '800' },
  centerSubHint: { textAlign: 'center', marginTop: 8, fontSize: 12, color: THEME.subText, fontWeight: '700' },
  compareHint: { textAlign: 'center', marginTop: 10, fontSize: 12, color: THEME.primary, fontWeight: '900' },

  // Completion / Goals
  completionTrack: { height: 12, backgroundColor: '#F2F4F7', borderRadius: 999, overflow: 'hidden', marginVertical: 12 },
  completionFill: { height: '100%', backgroundColor: THEME.green },
  statusGrid: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  statusItem: { alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 4 },
  statusLabel: { fontSize: 12, color: THEME.subText, fontWeight: '700' },
  statusCount: { fontSize: 14, color: THEME.text, fontWeight: '900', marginTop: 2 },

  // Donut Chart
  donutChartContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center', height: 200 },
  pieWrap: { alignItems: 'center', justifyContent: 'center' },
  donutHole: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: THEME.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  donutHoleText: { fontSize: 14, fontWeight: '900', color: THEME.text },
  donutHoleSubtext: { fontSize: 12, fontWeight: '700', color: THEME.subText },
  
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingHorizontal: 8 },
  balanceEmoji: { fontSize: 24, marginRight: 12 },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  balanceLabel: { fontSize: 14, fontWeight: '800', color: THEME.text },
  balancePct: { fontSize: 14, fontWeight: '900', color: THEME.subText },
  balanceTrack: { height: 8, backgroundColor: '#F2F4F7', borderRadius: 4, overflow: 'hidden' },
  balanceFill: { height: '100%', borderRadius: 4 },

  // Factors (Chips)
  twoCol: { flexDirection: 'row', gap: 16, marginTop: 8 },
  col: { flex: 1 },
  colTitle: { fontSize: 13, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1 },
  chipEmoji: { fontSize: 12, marginRight: 4 },
  chipLabel: { fontSize: 12, fontWeight: '800', marginRight: 6 },
  chipBadge: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  chipBadgeText: { fontSize: 10, fontWeight: '900', color: THEME.text },
  noDataText: { fontSize: 12, color: THEME.subText, textAlign: 'center', fontStyle: 'italic', marginTop: 10 },

  // Distribution
  distWrap: { marginTop: 8 },
  distRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  distLabel: { width: 24, fontSize: 14, fontWeight: '900', color: THEME.text },
  distTrack: { flex: 1, height: 10, backgroundColor: '#F2F4F7', borderRadius: 5, overflow: 'hidden', marginHorizontal: 8 },
  distFill: { height: '100%', backgroundColor: THEME.purple, borderRadius: 5 },
  distValue: { width: 30, textAlign: 'right', fontSize: 13, fontWeight: '800', color: THEME.subText },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: THEME.border },
  summaryItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  summaryLabel: { fontSize: 12, fontWeight: '800', color: THEME.subText },
  summaryPct: { fontSize: 14, fontWeight: '900' },

  // Heatmap
  hmLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: '#F9FAFB', padding: 8, borderRadius: 8 },
  hmLegendLabel: { fontSize: 11, fontWeight: '800', color: THEME.subText, marginRight: 8 },
  hmLegendBar: { flexDirection: 'row', borderRadius: 4, overflow: 'hidden', marginRight: 8 },
  hmLegendCell: { width: 16, height: 12 },
  hmLegendLabels: { flexDirection: 'row', gap: 40 },
  hmLegendText: { fontSize: 10, fontWeight: '700', color: THEME.subText },
  hmHeader: { flexDirection: 'row', marginBottom: 4 },
  hmHour: { fontSize: 9, color: '#98A2B3', textAlign: 'center' },
  hmBody: { marginBottom: 8 },
  hmRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  hmDay: { width: 32, fontSize: 10, fontWeight: '800', color: '#475467' },
  hmCell: { borderRadius: 2 },

  // Peak Time
  peakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  peakLabel: { width: 60, fontSize: 13, fontWeight: '800', color: THEME.text },
  peakTrack: { flex: 1, height: 10, backgroundColor: '#ECFDF5', borderRadius: 5, overflow: 'hidden', marginHorizontal: 12 },
  peakFill: { height: '100%', backgroundColor: THEME.green, borderRadius: 5 },
  peakValue: { width: 36, textAlign: 'right', fontSize: 13, fontWeight: '900', color: THEME.text },

  // Chart
  chartWrap: { marginTop: 12, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#EEF2F6', alignItems: 'center', paddingRight: 16 },
  chart: { marginVertical: 8, borderRadius: 14 },

  // Empty State
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E0F7FA', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: THEME.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: THEME.subText, textAlign: 'center', marginBottom: 24 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: THEME.primary, borderRadius: 999 },
  retryText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});