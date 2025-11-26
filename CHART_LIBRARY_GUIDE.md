# คู่มือติดตั้ง Chart Library สำหรับหน้า Trends

## 📊 ภาพรวม
หน้า Trends (Dashboard) ของ Planary ออกแบบมาเพื่อแสดงกราฟ 4 ประเภท:
1. **Line Chart** - แนวโน้มอารมณ์ (Mood Trend)
2. **Bar Chart** - ปัจจัยที่ส่งผลต่ออารมณ์ (Mood Factors)
3. **Donut Chart** - สรุปความสำเร็จ (Completion Rate)
4. **Pie Chart** - สมดุลชีวิต (Life Balance)

---

## 🎯 ตัวเลือก Chart Libraries (แนะนำ 2 ตัว)

### ตัวเลือก 1: react-native-chart-kit ⭐ แนะนำ
**ข้อดี:**
- ✅ ติดตั้งง่าย ใช้งานง่าย
- ✅ สวยงาม มี built-in styling
- ✅ รองรับ Line, Bar, Pie, Progress charts
- ✅ Documentation ดี มี examples เยอะ

**ข้อเสีย:**
- ❌ Customization จำกัดกว่า
- ❌ ไม่มี Donut chart แบบโปร่งตรงกลาง (ใช้ Pie แทนได้)

**การติดตั้ง:**
```bash
cd frontend
npm install react-native-chart-kit react-native-svg
```

**ตัวอย่างการใช้งาน:**
```javascript
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

// Line Chart - Mood Trend
<LineChart
  data={{
    labels: ['1', '2', '3', '4', '5', '6', '7'],
    datasets: [{ data: [3, 4, 4.5, 3.5, 4, 4.2, 3.8] }]
  }}
  width={screenWidth - 48}
  height={220}
  chartConfig={{
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(31, 111, 139, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
  }}
  bezier
  style={{ borderRadius: 16 }}
/>

// Pie Chart - Life Balance
<PieChart
  data={[
    { name: 'งาน', population: 50, color: '#2196f3', legendFontColor: '#333' },
    { name: 'สุขภาพ', population: 20, color: '#4caf50', legendFontColor: '#333' },
    { name: 'เรียน', population: 30, color: '#ff9800', legendFontColor: '#333' },
  ]}
  width={screenWidth - 48}
  height={200}
  chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
  accessor="population"
  backgroundColor="transparent"
  paddingLeft="15"
  center={[10, 0]}
  absolute
/>
```

---

### ตัวเลือก 2: react-native-gifted-charts
**ข้อดี:**
- ✅ Feature-rich มาก
- ✅ Customization สูง (colors, animations, tooltips)
- ✅ รองรับ Donut chart ที่สวยงาม
- ✅ มี interactive features (tap, scroll)

**ข้อเสีย:**
- ❌ Setup ซับซ้อนกว่า
- ❌ ต้องติดตั้ง dependencies หลายตัว

**การติดตั้ง:**
```bash
cd frontend
npm install react-native-gifted-charts react-native-svg react-native-linear-gradient
```

**ตัวอย่างการใช้งาน:**
```javascript
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';

// Line Chart - Mood Trend
<LineChart
  data={[
    { value: 3 },
    { value: 4 },
    { value: 4.5 },
    { value: 3.5 },
    { value: 4 },
  ]}
  color="#1f6f8b"
  thickness={3}
  startFillColor="#1f6f8b"
  endFillColor="#1f6f8b"
  startOpacity={0.4}
  endOpacity={0.1}
  spacing={40}
  initialSpacing={20}
  areaChart
  curved
/>

// Donut Chart - Completion Rate
<PieChart
  data={[
    { value: 80, color: '#4caf50', text: '80%' },
    { value: 15, color: '#2196f3', text: '15%' },
    { value: 5, color: '#9e9e9e', text: '5%' },
  ]}
  donut
  radius={90}
  innerRadius={60}
  innerCircleColor="#fff"
  centerLabelComponent={() => (
    <View>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>80%</Text>
      <Text style={{ fontSize: 12 }}>สำเร็จ</Text>
    </View>
  )}
/>
```

---

## 🚀 คำแนะนำการเลือก

| Feature | react-native-chart-kit | react-native-gifted-charts |
|---------|----------------------|---------------------------|
| ความง่าย | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| ความสวยงาม | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Customization | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Donut Chart | ❌ (ใช้ Pie แทน) | ✅ |
| เหมาะกับ | มือใหม่, ต้องการเร็ว | ต้องการ custom เยอะ |

**คำแนะนำ:**
- **เริ่มต้นด้วย react-native-chart-kit** - ติดตั้งง่าย ได้ผลลัพธ์เร็ว
- **อัพเกรดเป็น gifted-charts** - ถ้าต้องการ animations และ interactivity

---

## 📝 ขั้นตอนการ Implement (react-native-chart-kit)

### 1. ติดตั้ง
```bash
cd frontend
npm install react-native-chart-kit react-native-svg
```

### 2. Import ใน Trends.js
ลบ comment ในบรรทัดนี้:
```javascript
// import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
```
เป็น:
```javascript
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
```

### 3. แทนที่ Placeholder ด้วยกราฟจริง

**MoodTrendSection:**
แทนที่ `<View style={styles.chartPlaceholder}>...</View>` ด้วย:
```javascript
<LineChart
  data={{
    labels: data.map(d => d.date.split('-')[2]), // แสดงแค่วันที่
    datasets: [{ data: data.map(d => d.score) }]
  }}
  width={screenWidth - 48}
  height={220}
  chartConfig={{
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(31, 111, 139, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#1f6f8b'
    }
  }}
  bezier
  style={{ borderRadius: 16, marginTop: 8 }}
/>
```

**CompletionSection:**
แทนที่ placeholder ด้วย:
```javascript
<PieChart
  data={data.map(item => ({
    name: item.label,
    population: item.count,
    color: item.color,
    legendFontColor: '#333',
    legendFontSize: 12
  }))}
  width={screenWidth - 48}
  height={200}
  chartConfig={{
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`
  }}
  accessor="population"
  backgroundColor="transparent"
  paddingLeft="15"
  center={[10, 0]}
  absolute
/>
```

**LifeBalanceSection:**
แทนที่ placeholder ด้วย:
```javascript
<PieChart
  data={data.map(item => ({
    name: item.label,
    population: item.percentage,
    color: item.color,
    legendFontColor: '#333',
    legendFontSize: 12
  }))}
  width={screenWidth - 48}
  height={200}
  chartConfig={{
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`
  }}
  accessor="population"
  backgroundColor="transparent"
  paddingLeft="15"
  center={[10, 0]}
  absolute
/>
```

### 4. Test
```bash
# เริ่ม backend (terminal 1)
cd backend
uvicorn main:app --reload

# เริ่ม frontend (terminal 2)
cd frontend
npx expo start
```

เปิดแอปและไปที่หน้า "แนวโน้ม" (Trends) ในแท็บล่าง

---

## 🎨 Customization Tips

### สีของกราฟ
```javascript
// เปลี่ยนสีหลัก
color: (opacity = 1) => `rgba(31, 111, 139, ${opacity})` // น้ำเงิน Planary
color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})` // เขียว (success)
color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})` // แดง (danger)
```

### Gradient Background
```javascript
chartConfig={{
  backgroundGradientFrom: '#1f6f8b',
  backgroundGradientTo: '#4fc3f7',
  // ...
}}
```

### เพิ่ม Animation (gifted-charts)
```javascript
<LineChart
  data={...}
  animateOnDataChange
  animationDuration={500}
  isAnimated
/>
```

---

## 🐛 Troubleshooting

### Error: "Invariant Violation: requireNativeComponent: "RNSVGPath" was not found"
**แก้ไข:** ติดตั้ง react-native-svg ให้ถูกต้อง
```bash
npm install react-native-svg
cd ios && pod install  # สำหรับ iOS
```

### กราฟไม่แสดง / Error: "undefined is not an object"
**แก้ไข:** ตรวจสอบว่า data มี format ถูกต้อง
```javascript
// ต้องมี labels และ datasets
data={{
  labels: ['1', '2', '3'],
  datasets: [{ data: [1, 2, 3] }]  // ต้องเป็น array ของ object
}}
```

### กราฟโหลดช้า
**แก้ไข:** จำกัดจำนวน data points
```javascript
// แสดงเฉพาะ 30 วันล่าสุด
const limitedData = data.slice(-30);
```

---

## 📚 Resources

**react-native-chart-kit:**
- Documentation: https://github.com/indiespirit/react-native-chart-kit
- Examples: https://github.com/indiespirit/react-native-chart-kit#examples

**react-native-gifted-charts:**
- Documentation: https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts
- Demos: https://gifted-charts.web.app/

**React Native SVG:**
- Documentation: https://github.com/software-mansion/react-native-svg

---

## ✅ Checklist

- [ ] ติดตั้ง chart library
- [ ] Import library ใน Trends.js
- [ ] แทนที่ placeholder ด้วยกราฟจริง
- [ ] Test ทุก section
- [ ] Customize สีและ styling
- [ ] Test กับข้อมูลจริงจาก backend
- [ ] Test บน iOS และ Android
- [ ] ปรับ performance (ถ้าจำเป็น)

---

**หมายเหตุ:** Backend API พร้อมใช้งานแล้ว (`/trends/summary`) เพียงติดตั้ง chart library และแทนที่ placeholder เท่านั้น!
