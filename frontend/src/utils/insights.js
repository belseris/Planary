/**
 * insights.js - Generate actionable insights from mood, completion, and life balance data
 * Uses simple if/else logic (no AI) to analyze metrics and generate Thai text insights
 */

/**
 * Generate insights for personal mood analysis
 * @param {Object} meMood - User's mood data {average, median, stddev, trend_diff, ...}
 * @param {Object} communityMood - Community mood data {average, percentile_of_me, ...}
 * @returns {string[]} Array of insight messages
 */
export function buildMoodInsight(meMood, communityMood) {
  if (!meMood) return [];
  const msgs = [];

  // 1) ระดับอารมณ์เฉลี่ย
  if (meMood.average >= 4.2) {
    msgs.push('✨ ช่วงนี้ภาพรวมอารมณ์คุณดีมาก อยู่ในโซนเขียว');
  } else if (meMood.average >= 3.2) {
    msgs.push('😊 อารมณ์คุณอยู่ในระดับปานกลางถึงดี');
  } else if (meMood.average >= 2.2) {
    msgs.push('😐 ช่วงนี้อารมณ์เริ่มตกลงมาหน่อย ลองพักผ่อนมากขึ้น');
  } else {
    msgs.push('😞 อารมณ์คุณค่อนข้างต่ำต่อเนื่อง ลองหาใครสักคนคุยด้วยดูนะ');
  }

  // 2) เทียบกับช่วงก่อนหน้า
  if (meMood.trend_diff > 0.3) {
    msgs.push('📈 ดีขึ้นจากช่วงก่อนอย่างชัดเจน');
  } else if (meMood.trend_diff < -0.3) {
    msgs.push('📉 ลดลงจากช่วงก่อนค่อนข้างเยอะ ลองสังเกตว่าช่วงนี้เกิดอะไรขึ้นบ่อย ๆ');
  }

  // 3) ความเหวี่ยง (stddev)
  if (meMood.stddev !== undefined) {
    if (meMood.stddev < 0.5) {
      msgs.push('🟢 อารมณ์ของคุณค่อนข้างนิ่งและคงที่');
    } else if (meMood.stddev > 1.0) {
      msgs.push('🎢 อารมณ์ขึ้นลงแรงในช่วงนี้ ลองหากิจกรรมที่ช่วยบาลานซ์ดู');
    }
  }

  // 4) เทียบกับชุมชน
  if (communityMood && typeof communityMood.percentile_of_me === 'number') {
    const p = communityMood.percentile_of_me;
    if (p >= 0.8) {
      msgs.push('👑 คุณมีอารมณ์ดีกว่าผู้ใช้อื่นส่วนใหญ่ (Top 20%)');
    } else if (p <= 0.2) {
      msgs.push('💡 อารมณ์คุณต่ำกว่าค่าเฉลี่ยของชุมชนพอสมควร (Bottom 20%)');
    } else if (p >= 0.5) {
      msgs.push('➡️ อารมณ์คุณใกล้เคียงกับเฉลี่ยของชุมชน');
    }
  }

  return msgs;
}

/**
 * Generate insights for personal completion/discipline analysis
 * @param {Object} completion - Completion data {overall_rate, daily, streak_best, ...}
 * @returns {string[]} Array of insight messages
 */
export function buildCompletionInsight(completion) {
  if (!completion) return [];
  const msgs = [];
  const rate = completion.overall_rate || 0;

  if (rate >= 80) {
    msgs.push('🏆 คุณทำเป้าหมายสำเร็จเกิน 80% วินัยดีมาก');
  } else if (rate >= 60) {
    msgs.push('💪 คุณทำเป้าหมายสำเร็จราว 60-80% ดีทีเดียว');
  } else if (rate >= 50) {
    msgs.push('📊 คุณทำเป้าหมายสำเร็จประมาณครึ่งหนึ่ง ยังมีช่องให้พัฒนาอีกนิด');
  } else {
    msgs.push('⚠️ อัตราสำเร็จยังต่ำ ลองลดจำนวนงานต่อวันให้เหมาะกับพลังงานจริง');
  }

  if (completion.streak_best !== undefined && completion.streak_best > 0) {
    if (completion.streak_best >= 5) {
      msgs.push(`🔥 คุณเคยทำงานครบติดกัน ${completion.streak_best} วัน ลองทำลายสถิติดูไหม`);
    } else if (completion.streak_best >= 3) {
      msgs.push(`⭐ เคยทำสำเร็จติดกัน ${completion.streak_best} วัน ความพยายามดีมาก`);
    }
  }

  return msgs;
}

/**
 * Generate insights for life balance analysis
 * @param {Object} lifeBalance - Life balance data {data: [], warnings: [], ...}
 * @returns {string[]} Array of insight messages
 */
export function buildLifeBalanceInsight(lifeBalance) {
  if (!lifeBalance) return [];
  const msgs = [];

  // ใช้ warnings จาก backend ตรง ๆ ก็ได้
  if (Array.isArray(lifeBalance.warnings)) {
    msgs.push(...lifeBalance.warnings);
  }

  if (!Array.isArray(lifeBalance.data)) return msgs;

  const work = lifeBalance.data.find(c => c.key === 'work');
  const health = lifeBalance.data.find(c => c.key === 'health');
  const social = lifeBalance.data.find(c => c.key === 'social');

  if (work && work.percentage > 60) {
    msgs.push('⚠️ หมวดงานใช้เวลามากกว่า 60% ของทั้งหมด ลองกันเวลาพักผ่อนเพิ่ม');
  }
  if (health && health.percentage < 10) {
    msgs.push('🏥 หมวดสุขภาพมีสัดส่วนน้อยมาก ลองเพิ่มกิจกรรมดูแลตัวเองสักเล็กน้อย');
  }
  if (social && social.percentage < 5) {
    msgs.push('👥 กิจกรรมทางสังคมค่อนข้างน้อย ลองหาเวลาเพื่อความสัมพันธ์');
  }

  // Positive message
  if (work && work.percentage <= 50 && health && health.percentage >= 10) {
    msgs.push('✅ สมดุลชีวิตของคุณดูดี ชีวิตค่อนข้างสมดุล');
  }

  return msgs;
}

/**
 * Analyze relationship between mood and completion
 * @param {Object} meMood - User's mood data
 * @param {Object} completion - User's completion data
 * @returns {string[]} Array of relationship insights
 */
export function buildMoodCompletionLink(meMood, completion) {
  if (!meMood || !completion) return [];
  const msgs = [];

  const mood = meMood.average;
  const rate = completion.overall_rate;

  if (mood >= 3.5 && rate >= 70) {
    msgs.push('🌟 อารมณ์ดี + งานสำเร็จ = สัญญาณดีของสมดุลชีวิต');
  } else if (mood >= 3.5 && rate < 40) {
    msgs.push('🎯 อารมณ์ดี แต่ทำงานน้อย - อาจเพราะพักได้เพียงพอ');
  } else if (mood < 2.5 && rate >= 70) {
    msgs.push('⚡ ทำงานสำเร็จมากแต่อารมณ์ต่ำ - อาจจากความเหนื่อย ลองพักดู');
  } else if (mood < 2.5 && rate < 40) {
    msgs.push('💔 ทั้งอารมณ์ต่ำและงานไม่สำเร็จ - ลองแยกปัญหาว่ามาจากไหน');
  }

  return msgs;
}

/**
 * Generate community mood insight
 * @param {Object} communityMood - Community mood data
 * @returns {string[]} Array of community insights
 */
export function buildCommunityMoodInsight(communityMood) {
  if (!communityMood) return [];
  const msgs = [];

  const avg = communityMood.average;

  if (avg >= 3.8) {
    msgs.push('☀️ ชุมชนอยู่ในอารมณ์ดี');
  } else if (avg >= 3.0) {
    msgs.push('😐 ชุมชนมีอารมณ์ปานกลาง');
  } else {
    msgs.push('😔 ชุมชนอยู่ในอารมณ์ค่อนข้างต่ำ');
  }

  if (communityMood.stddev !== undefined) {
    if (communityMood.stddev < 0.6) {
      msgs.push('🎯 ความรู้สึกของชุมชนค่อนข้างเหมือนกัน');
    } else if (communityMood.stddev > 1.0) {
      msgs.push('🌈 ความรู้สึกของชุมชนค่อนข้างแตกต่างกัน');
    }
  }

  return msgs;
}

/**
 * Generate percentile rank text
 * @param {number} percentile - Percentile rank (0-1)
 * @returns {string} Human-readable percentile text
 */
export function buildPercentileText(percentile) {
  if (percentile === null || percentile === undefined) return '';
  const percent = Math.round(percentile * 100);
  return `คุณอยู่ใน Top ${100 - percent}% ของอารมณ์รวมทั้งหมด`;
}
