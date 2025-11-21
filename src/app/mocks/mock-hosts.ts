const GB = 1024 * 1024 * 1024;
const now = Math.floor(Date.now() / 1000);

export interface MockHostSummary {
  hostid: string;
  host: string;
  interfaces: { ip: string }[];
  isAvailable: boolean;
  description: string;
}

export interface MockDiskStats {
  hostid: string;
  itemid: string;
  disk: string;
  available: number;
  used: number;
  total: number;
  usedPercentage: number;
  availablePercentage: number;
}

export interface MockHostDetail {
  hostid: string;
  isAvailable: boolean;
  disks: MockDiskStats[];
  cpu: number;
  memory: number;
  os: string;
  hostname: string;
  lastclock: number;
}

interface MockHostDefinition {
  group: string;
  summary: MockHostSummary;
  detail: MockHostDetail;
}

const toBytes = (value: number): number => Math.round(value * GB);

const createDisk = (
  hostid: string,
  label: string,
  totalGb: number,
  usedGb: number
): MockDiskStats => {
  const total = toBytes(totalGb);
  const used = toBytes(Math.min(usedGb, totalGb));
  const available = Math.max(total - used, 0);
  const usedPercent = total > 0 ? Math.round((used / total) * 100) : 0;
  return {
    hostid,
    itemid: `${hostid}-${label.replace(/[^a-z0-9]/gi, '').toLowerCase()}`,
    disk: label,
    used,
    available,
    total,
    usedPercentage: usedPercent,
    availablePercentage: 100 - usedPercent
  };
};

const newHost = (
  group: string,
  hostid: string,
  host: string,
  ip: string,
  description: string,
  isAvailable: boolean,
  os: string,
  cpu: number,
  memory: number,
  disks: Array<{ label: string; total: number; used: number }>
): MockHostDefinition => ({
  group,
  summary: {
    hostid,
    host,
    interfaces: [{ ip }],
    isAvailable,
    description
  },
  detail: {
    hostid,
    isAvailable,
    disks: disks.map((disk) => createDisk(hostid, disk.label, disk.total, disk.used)),
    cpu,
    memory,
    os,
    hostname: host.toLowerCase(),
    lastclock: now - Math.floor(Math.random() * 40 + 10)
  }
});

const definitions: MockHostDefinition[] = [
  // PLTCM
  newHost(
    'pltcm',
    'PLTCM-001',
    'PLTCM-HMI-01',
    '172.16.10.10',
    'Сервер визуализации линии PLTCM',
    true,
    'Windows Server 2019',
    42.5,
    68.1,
    [
      { label: 'C:', total: 480, used: 310 },
      { label: 'D:', total: 920, used: 450 }
    ]
  ),
  newHost(
    'pltcm',
    'PLTCM-002',
    'PLTCM-APP-02',
    '172.16.10.22',
    'Приложение расчета профиля',
    true,
    'Windows Server 2016',
    58.2,
    73.4,
    [
      { label: 'C:', total: 512, used: 280 },
      { label: 'E:', total: 2048, used: 1320 }
    ]
  ),
  newHost(
    'pltcm',
    'PLTCM-003',
    'PLTCM-DB-03',
    '172.16.10.35',
    'Основная база данных HMI',
    false,
    'Red Hat Enterprise Linux 8',
    12.4,
    44.2,
    [
      { label: 'root', total: 256, used: 210 },
      { label: 'data', total: 4096, used: 3020 }
    ]
  ),

  // CALCGL
  newHost(
    'calcgl',
    'CAL-001',
    'CALCGL-CTRL-01',
    '172.20.5.11',
    'Контроллер линии CAL',
    true,
    'Windows Server 2012 R2',
    33.1,
    59.3,
    [
      { label: 'C:', total: 320, used: 200 },
      { label: 'Logs', total: 800, used: 610 }
    ]
  ),
  newHost(
    'calcgl',
    'CAL-002',
    'CALCGL-HIST-02',
    '172.20.5.25',
    'Исторический архив данных CAL',
    true,
    'Ubuntu Server 20.04',
    71.8,
    82.1,
    [
      { label: 'root', total: 256, used: 180 },
      { label: 'archive', total: 6144, used: 4210 }
    ]
  ),
  newHost(
    'calcgl',
    'CAL-003',
    'CALCGL-BCKP-03',
    '172.20.5.40',
    'Резервное хранилище CAL',
    true,
    'Debian 11',
    24.5,
    35.9,
    [
      { label: 'C:', total: 512, used: 150 },
      { label: 'backup', total: 8192, used: 2840 }
    ]
  ),

  // CGL
  newHost(
    'cgl',
    'CGL-001',
    'CGL-HMI-01',
    '172.30.1.14',
    'HMI сервера линии CGL',
    true,
    'Windows 10 IoT',
    64.7,
    48.9,
    [
      { label: 'C:', total: 256, used: 190 },
      { label: 'D:', total: 1024, used: 810 }
    ]
  ),
  newHost(
    'cgl',
    'CGL-002',
    'CGL-PLC-02',
    '172.30.1.26',
    'PLC шлюз для CGL',
    true,
    'Windows Server 2016',
    29.2,
    61.4,
    [
      { label: 'C:', total: 256, used: 120 },
      { label: 'E:', total: 512, used: 210 }
    ]
  ),
  newHost(
    'cgl',
    'CGL-003',
    'CGL-DB-03',
    '172.30.1.43',
    'SQL база трекера CGL',
    false,
    'CentOS 7',
    17.5,
    29.8,
    [
      { label: 'root', total: 512, used: 305 },
      { label: 'data', total: 6144, used: 5099 }
    ]
  ),

  // CGL3
  newHost(
    'cgl3',
    'CGL3-001',
    'CGL3-HMI-01',
    '172.31.12.12',
    'Основной HMI CGL3',
    true,
    'Windows 11 Enterprise',
    56.1,
    64.2,
    [
      { label: 'C:', total: 512, used: 350 },
      { label: 'D:', total: 1024, used: 540 }
    ]
  ),
  newHost(
    'cgl3',
    'CGL3-002',
    'CGL3-APP-02',
    '172.31.12.25',
    'Сервер приложений анализа',
    true,
    'Windows Server 2022',
    48.5,
    70.3,
    [
      { label: 'C:', total: 512, used: 220 },
      { label: 'E:', total: 4096, used: 2110 }
    ]
  ),
  newHost(
    'cgl3',
    'CGL3-003',
    'CGL3-ARCH-03',
    '172.31.12.40',
    'Архиватор тревог CGL3',
    false,
    'Rocky Linux 8',
    9.7,
    28.6,
    [
      { label: 'root', total: 256, used: 200 },
      { label: 'archive', total: 8192, used: 6200 }
    ]
  ),

  // RCL
  newHost(
    'rcl',
    'RCL-001',
    'RCL-HMI-01',
    '172.40.5.10',
    'Рабочая станция оператора RCL',
    true,
    'Windows 10',
    34.2,
    52.8,
    [
      { label: 'C:', total: 256, used: 150 },
      { label: 'Logs', total: 512, used: 120 }
    ]
  ),
  newHost(
    'rcl',
    'RCL-002',
    'RCL-ANL-02',
    '172.40.5.21',
    'Аналитический сервер RCL',
    true,
    'Ubuntu Server 22.04',
    67.9,
    74.5,
    [
      { label: 'root', total: 512, used: 230 },
      { label: 'data', total: 3072, used: 1890 }
    ]
  ),
  newHost(
    'rcl',
    'RCL-003',
    'RCL-BCKP-03',
    '172.40.5.33',
    'Резервный сервер RCL',
    false,
    'Debian 12',
    14.1,
    37.4,
    [
      { label: 'root', total: 256, used: 110 },
      { label: 'backup', total: 2048, used: 600 }
    ]
  ),

  // CPL
  newHost(
    'cpl',
    'CPL-001',
    'CPL-HMI-01',
    '172.50.10.11',
    'Станция оператора CPL',
    true,
    'Windows 10',
    46.8,
    58.1,
    [
      { label: 'C:', total: 256, used: 190 },
      { label: 'D:', total: 512, used: 330 }
    ]
  ),
  newHost(
    'cpl',
    'CPL-002',
    'CPL-APP-02',
    '172.50.10.23',
    'Сервер расчётов PLC',
    true,
    'Windows Server 2019',
    61.5,
    69.4,
    [
      { label: 'C:', total: 512, used: 260 },
      { label: 'E:', total: 2048, used: 870 }
    ]
  ),
  newHost(
    'cpl',
    'CPL-003',
    'CPL-ARCH-03',
    '172.50.10.35',
    'Архиватор трендов CPL',
    false,
    'CentOS Stream 9',
    21.4,
    33.8,
    [
      { label: 'root', total: 512, used: 210 },
      { label: 'archive', total: 4096, used: 2800 }
    ]
  )
];

export const MOCK_HOSTS_BY_GROUP: Record<string, MockHostSummary[]> = {};
export const MOCK_HOST_DETAILS: Record<string, MockHostDetail> = {};

for (const definition of definitions) {
  const key = definition.group.toLowerCase();
  if (!MOCK_HOSTS_BY_GROUP[key]) {
    MOCK_HOSTS_BY_GROUP[key] = [];
  }
  MOCK_HOSTS_BY_GROUP[key].push(definition.summary);
  MOCK_HOST_DETAILS[definition.summary.hostid] = definition.detail;
}

MOCK_HOSTS_BY_GROUP['general'] = definitions.map((definition) => definition.summary);

