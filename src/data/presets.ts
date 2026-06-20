import type { TreatmentType, Priority } from '@/types';

export interface TreatmentPreset {
  defaultDays: number[];
  priorityMap: Record<number, Priority>;
  defaultInstructions: string;
  defaultContraindications: string;
  phoneTemplate: string;
}

export const TREATMENT_PRESETS: Record<TreatmentType, TreatmentPreset> = {
  implant: {
    defaultDays: [0, 3, 7, 14, 30, 90],
    priorityMap: { 0: 'high', 3: 'high', 7: 'medium', 14: 'low', 30: 'low', 90: 'low' },
    defaultInstructions: '1. 术后24小时内冷敷，减轻肿胀\n2. 按医嘱服用抗生素和止痛药\n3. 保持口腔卫生，术后24小时后可轻柔刷牙\n4. 饮食以温凉软食为主\n5. 避免剧烈运动',
    defaultContraindications: '1. 禁止吸烟饮酒\n2. 避免用手术侧咀嚼\n3. 避免食用辛辣、过热、过硬食物\n4. 不要舔舐或吸吮伤口\n5. 如有缝线，避免用手触摸',
    phoneTemplate: '您好，我是XX牙科的护士，想做一下种植牙术后回访。请问您现在感觉怎么样？\n\n需要确认的事项：\n1. 疼痛程度如何？是否有加重？\n2. 肿胀情况怎么样？\n3. 有没有按时吃抗生素和止痛药？\n4. 饮食上有没有注意吃软食？\n5. 有没有吸烟饮酒？\n\n温馨提醒：术后24小时内可以冷敷消肿，24小时后注意口腔卫生，饮食以温凉软食为主，避免用手术侧咀嚼。如有剧烈疼痛或出血不止请及时联系我们。'
  },
  extraction: {
    defaultDays: [0, 3, 7],
    priorityMap: { 0: 'high', 3: 'medium', 7: 'low' },
    defaultInstructions: '1. 咬紧棉球30-40分钟止血\n2. 术后24小时内冷敷\n3. 24小时后可漱口，保持创口清洁\n4. 进食温凉软食\n5. 按医嘱服药',
    defaultContraindications: '1. 24小时内禁止刷牙漱口\n2. 禁止吸烟饮酒\n3. 避免反复吸吮、吐口水\n4. 避免用舌头舔伤口\n5. 禁食辛辣刺激及过热食物',
    phoneTemplate: '您好，我是XX牙科的护士，想做一下拔牙术后回访。请问您现在感觉怎么样？\n\n需要确认的事项：\n1. 伤口还疼吗？有没有出血？\n2. 有没有咬紧棉球止血？\n3. 有没有按时吃药？\n4. 饮食上有没有注意？\n5. 有没有吸烟饮酒？\n\n温馨提醒：术后24小时内不要刷牙漱口，不要反复吸吮吐口水，饮食以温凉软食为主。如果出血不止或疼痛加剧请及时联系我们。'
  },
  root_canal: {
    defaultDays: [1, 7, 14],
    priorityMap: { 1: 'medium', 7: 'medium', 14: 'low' },
    defaultInstructions: '1. 治疗后2小时内禁食\n2. 避免用患侧咀嚼\n3. 注意口腔卫生，饭后漱口\n4. 如有轻微肿痛属正常反应\n5. 按医嘱服用消炎药',
    defaultContraindications: '1. 暂封材料未固化前勿进食\n2. 避免食用过硬粘性食物\n3. 如出现剧烈疼痛请及时复诊\n4. 治疗期间避免烟酒刺激',
    phoneTemplate: '您好，我是XX牙科的护士，想做一下根管治疗后的回访。请问您现在感觉怎么样？\n\n需要确认的事项：\n1. 牙齿还疼吗？有没有咬合痛？\n2. 有没有按时吃消炎药？\n3. 有没有用患侧咀嚼？\n4. 暂封材料有没有脱落？\n\n温馨提醒：治疗后2小时内不要进食，避免用患侧咀嚼过硬食物，注意口腔卫生。如果出现剧烈疼痛或暂封材料脱落请及时联系我们。'
  }
};

export const TREATMENT_OPTIONS: { value: TreatmentType; label: string; desc: string }[] = [
  { value: 'implant', label: '种植牙', desc: '人工牙根植入修复缺牙' },
  { value: 'extraction', label: '拔牙', desc: '拔除无法保留的患牙' },
  { value: 'root_canal', label: '根管治疗', desc: '治疗牙髓及根尖周病变' }
];
