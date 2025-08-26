import React, { useMemo, useState } from 'react';
import { useAchievements } from '../../../../hooks/useAchievements';
import { AchievementItem } from '../../../../services/achievements';
import { 
  TrophyOutlined, StarOutlined, FireOutlined, ThunderboltOutlined, AimOutlined, CrownOutlined, SearchOutlined 
} from '@ant-design/icons';
import { Card, Typography, Row, Col, Space, Tag, Input, Select, Progress, Empty, Spin, Alert } from 'antd';
import './AchievementsPage.scss';

const { Title, Text } = Typography;

const rarityDefs: Record<string, { label: string; className: string; gradient?: boolean }> = {
  common: { label: 'Yaygın', className: 'rarity-common' },
  rare: { label: 'Nadir', className: 'rarity-rare' },
  epic: { label: 'Epik', className: 'rarity-epic' },
  legendary: { label: 'Efsanevi', className: 'rarity-legendary', gradient: true },
  mythic: { label: 'Mitik', className: 'rarity-mythic', gradient: true }
};

const iconMap: Record<string, React.ReactNode> = {
  star: <StarOutlined />,
  fire: <FireOutlined />,
  lightning: <ThunderboltOutlined />,
  streak: <FireOutlined />,
  speed: <ThunderboltOutlined />,
  target: <AimOutlined />,
  crown: <CrownOutlined />
};

// Kategori Türkçeleştirme haritası
const categoryLabels: Record<string, string> = {
  study: 'Çalışma',
  study_time: 'Çalışma Süresi',
  streak: 'Seri',
  questions: 'Soru',
  questions_total: 'Toplam Soru',
  duel: 'Düello',
  flashcards: 'Flashcard',
  exam: 'Deneme',
  topic: 'Konu',
  efficiency: 'Verimlilik',
  first_session: 'İlk Oturum'
};

const formatCategory = (key: string) => categoryLabels[key] || key.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());

const AchievementsPage: React.FC = () => {
  const { items, stats, loading, params, refetch, setParams, error } = useAchievements({ sort: 'progress' });
  const [search, setSearch] = useState('');

  const categories = useMemo(() => Array.from(new Set(items.map(i => i.category))).sort(), [items]);
  const rarities = useMemo(() => Array.from(new Set(items.map(i => i.rarity))).sort(), [items]);

  const handleParam = (key: string, value: any) => {
    const next = { ...params, [key]: value };
    setParams(next);
    refetch(next);
  };

  const filtered = items.filter(it => {
    if (search) {
      const q = search.toLowerCase();
      if (!it.title.toLowerCase().includes(q) && !it.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalUnlockedXP = filtered.filter(f => f.isUnlocked).reduce((s, a) => s + (a.points || 0), 0);

  return (
    <div className="achievements-modern">
      <div className="achievements-header">
        <Space align="center" size={16} className="title-row">
          <div className="icon-badge"><TrophyOutlined /></div>
          <div>
            <Title level={2} className="page-title">Rozetlerim</Title>
            {stats && (
              <Text type="secondary" className="subtitle">{stats.unlocked}/{stats.total} (%{stats.completionRate}) tamamlandı · {totalUnlockedXP} XP</Text>
            )}
          </div>
        </Space>
        <div className="filters">
          <Input
            placeholder="Rozet ara..."
            value={search}
            onChange={e => { setSearch(e.target.value); }}
            allowClear
            prefix={<SearchOutlined style={{ color: 'var(--ant-color-text-tertiary)' }} />}
            size="middle"
            style={{ maxWidth: 240 }}
          />
          <Select
            allowClear
            placeholder="Kategori"
            size="middle"
            value={params.category}
            onChange={v => handleParam('category', v)}
            options={categories.map(c => ({ value: c, label: formatCategory(c) }))}
            style={{ minWidth: 160 }}
          />
            <Select
              allowClear
              placeholder="Nadirlik"
              size="middle"
              value={params.rarity}
              onChange={v => handleParam('rarity', v)}
              options={rarities.map(r => ({ value: r, label: rarityDefs[r]?.label || r }))}
              style={{ minWidth: 140 }}
            />
            <Select
              size="middle"
              value={params.unlocked === undefined ? 'all' : params.unlocked ? 'unlocked' : 'locked'}
              onChange={val => handleParam('unlocked', val === 'all' ? undefined : (val === 'unlocked'))}
              style={{ width: 140 }}
              options={[
                { value: 'all', label: 'Tümü' },
                { value: 'unlocked', label: 'Açık' },
                { value: 'locked', label: 'Kilitli' }
              ]}
            />
            <Select
              size="middle"
              value={params.sort || 'progress'}
              onChange={v => handleParam('sort', v)}
              style={{ width: 150 }}
              options={[
                { value: 'progress', label: 'İlerleme' },
                { value: 'newest', label: 'Yeni' },
                { value: 'rarity', label: 'Nadirlik' },
                { value: 'title', label: 'Başlık' }
              ]}
            />
        </div>
      </div>

      {error && <Alert type="error" message="Yüklenemedi" description={error} showIcon style={{ marginBottom:16 }} />}
      {loading && <div className="loading-block"><Spin /></div>}
      {!loading && filtered.length === 0 && <Empty description="Hiç rozet bulunamadı" className="empty" />}

  <Row gutter={[20,20]} className="achievement-grid">
        {filtered.map(item => (
          <Col key={item.id} xs={24} sm={12} md={8} lg={6} xl={6}>
            <AchievementCard item={item} />
          </Col>
        ))}
      </Row>
    </div>
  );
};

const AchievementCard: React.FC<{ item: AchievementItem }> = ({ item }) => {
  const rarity = rarityDefs[item.rarity] || { label: item.rarity, className: 'rarity-common' };
  const percent = item.progress;
  const icon = iconMap[item.icon] || <TrophyOutlined />;
  return (
    <Card 
      className={`ach-card ${rarity.className}`}
      hoverable
      bodyStyle={{ padding: 18 }}
    >
      <div className="card-top">
        <Tag className={`rarity-tag ${rarity.gradient ? 'gradient' : ''}`}>{rarity.label}</Tag>
        {item.isUnlocked && <div className="completion-badge" title="Tamamlandı"><TrophyOutlined /></div>}
      </div>
      <div className="icon-row">
        <div className={`icon-shell ${item.isUnlocked ? 'icon-active' : ''}`}>{icon}</div>
        <div className="titles">
          <div className="ach-title">{item.title}</div>
          <div className="ach-desc">{item.description}</div>
          <div className="ach-cat-tag">
            <Tag color="blue" style={{ marginTop:4 }}>{formatCategory(item.category)}</Tag>
          </div>
        </div>
      </div>
      <div className="progress-block">
        <div className="progress-line">
          <span className="label">İlerleme</span>
          <span className="value">{item.currentValue}/{item.targetValue}</span>
        </div>
        <Progress percent={percent} size="small" strokeWidth={10} showInfo={false} status={item.isUnlocked ? 'success' : 'active'} />
        <div className="meta-row">
          <span className="xp">{item.points} XP</span>
          <span className="pct">{percent}%</span>
        </div>
      </div>
  {/* lock overlay kaldırıldı */}
    </Card>
  );
};

export default AchievementsPage;
