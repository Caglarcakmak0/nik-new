import React, { useState, useCallback } from 'react';
import { Tooltip, Modal } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';

interface VideoItem {
  videoId?: string;
  title?: string;
  titleText?: string;
  description?: string;
  duration?: string;
  durationSeconds?: number;
  thumbnail?: string;
  thumbnailUrl?: string;
  thumb?: string;
  thumbnails?: any;
  position?: number;
  channelTitle?: string;
  _used?: boolean;
}

interface ProgramDetailLayoutProps {
  subjectName: string;
  description?: string;
  videos: VideoItem[];
  getThumbnailUrl: (v: any) => string;
  videoMetaMap: Record<string, any>;
  onSelectVideo?: (video: VideoItem) => void;
}

// Simple utility for formatting duration when seconds present
const formatDuration = (v: VideoItem, meta?: any) => {
  if (meta?.duration) return meta.duration;
  if (v.duration) return v.duration;
  if (v.durationSeconds) {
    const mins = Math.ceil(v.durationSeconds / 60);
    if (mins < 60) return mins + ' dk';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h} saat` : `${h} saat ${m} dk`;
  }
  return '';
};

const ProgramDetailLayout: React.FC<ProgramDetailLayoutProps> = ({
  subjectName,
  description,
  videos,
  getThumbnailUrl,
  videoMetaMap,
  onSelectVideo
}) => {
  // Tüm videoları göster (eski kısıtlama slice(0,2) kaldırıldı)
  const primaryVideos = videos; // tam liste
  const [openVideo, setOpenVideo] = useState<VideoItem | null>(null);

  const extractVideoId = (v: VideoItem): string | null => {
    // Direct common fields
    let cand = v.videoId || (v as any).id || (v as any).videoID || (v as any).youtubeId || null;
    // Nested YouTube API playlist item shapes
    if (!cand && (v as any).snippet?.resourceId?.videoId) cand = (v as any).snippet.resourceId.videoId;
    if (!cand && (v as any).snippet?.videoId) cand = (v as any).snippet.videoId;
    if (!cand && (v as any).contentDetails?.videoId) cand = (v as any).contentDetails.videoId;
    if (!cand && (v as any).resourceId?.videoId) cand = (v as any).resourceId.videoId;
    if (cand) {
      // Plain ID
      if (/^[a-zA-Z0-9_-]{11}$/.test(cand)) return cand;
      // Possibly URL
      try {
        const url = new URL(cand.startsWith('http') ? cand : 'https://youtu.be/' + cand);
        if (url.hostname.includes('youtu')) {
          if (url.searchParams.get('v')) return url.searchParams.get('v');
          const parts = url.pathname.split('/').filter(Boolean);
          const maybe = parts.pop();
          if (maybe && /^[a-zA-Z0-9_-]{11}$/.test(maybe)) return maybe;
        }
      } catch (_) {}
    }
    const meta = (v.videoId && videoMetaMap[v.videoId]) || null;
    if (meta?.id && /^[a-zA-Z0-9_-]{11}$/.test(meta.id)) return meta.id;
    return null;
  };

  const handleOpen = useCallback((v: VideoItem) => {
    setOpenVideo(v);
    onSelectVideo?.(v);
  }, [onSelectVideo]);

  const handleClose = () => setOpenVideo(null);

  const getVideoTitle = (v: VideoItem) => {
    const meta = v.videoId ? videoMetaMap[v.videoId] : null;
    return v.title || v.titleText || meta?.title || 'Video';
  };
  return (
    <div className="program-detail-layout">
      <div className="pdl-grid">
        {/* Main column */}
        <div className="pdl-center is-primary">
          <div className="pdl-center-header " >
            <h3 className="pdl-heading">{subjectName}</h3>
            {description && <p className="pdl-desc">{description}</p>}
          </div>
       
        </div>
        {/* Right column details - now horizontal list */}
  <div className="pdl-right" style={{ display:'flex', gap:16, flexDirection:'coluumn', flexWrap:'wrap', justifyContent:'flex-start', maxHeight:420, overflowY:'auto', paddingRight:4 }}>
            {primaryVideos.map((v, i) => {
        const meta = v.videoId ? videoMetaMap[v.videoId] : null;
              const title = v.title || v.titleText || meta?.title || 'Video';
              const channel = meta?.channelTitle || v.channelTitle || '';
              const dur = formatDuration(v, meta);
              const thumb = getThumbnailUrl(meta || v);
        const id = extractVideoId(v);
              return (
                <div
                  key={v.videoId || i}
                  className="pdl-video-detail horizontal"
                  role="button"
                  tabIndex={0}
                  onClick={() => id ? handleOpen(v) : window.open((v as any).url || (v as any).link || '#','_blank')}
                  onKeyDown={(e) => { if (e.key === 'Enter') { id ? handleOpen(v) : window.open((v as any).url || (v as any).link || '#','_blank'); } }}
                  aria-label={`${title} oynat`}
                  style={{
                    display:'flex',
                    flexDirection:'column',
                    width:220,
                    background:'rgba(255,255,255,0.04)',
                    border:'1px solid rgba(255,255,255,0.08)',
                    borderRadius:12,
                    padding:12,
                    cursor:'pointer'
                  }}
                >
                  <div className="pdl-thumb-wrapper" style={{ position:'relative', width:'100%', borderRadius:8, overflow:'hidden', aspectRatio:'16/9', marginBottom:8 }}>
                    <img src={thumb} alt={title} className="pdl-thumb" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    {/* Play button centered */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 2,
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '50%',
                        padding: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <PlayCircleOutlined style={{ fontSize: 44, color: '#fff' }} />
                    </div>
                    {dur && <span className="pdl-duration" >{dur}</span>}
                  </div>
                  <div className="pdl-video-texts" style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <Tooltip title={title}><h4 className="pdl-video-title" style={{ margin:0, fontSize:14, fontWeight:600, lineHeight:1.25 }}>{title}</h4></Tooltip>
                    {channel && <div className="pdl-channel" style={{ fontSize:12, opacity:0.6 }}>{channel}</div>}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      <Modal
        open={!!openVideo}
        onCancel={handleClose}
        footer={null}
        centered
        width={880}
        destroyOnClose
        getContainer={false}
        title={openVideo ? getVideoTitle(openVideo) : ''}
      >
        {openVideo ? (() => {
          const id = extractVideoId(openVideo);
          if (!id) return <div style={{ padding: '24px 8px' }}>Bu video için oynatılabilir kaynak bulunamadı.</div>;
          return (
            <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&mute=1`}
                title={getVideoTitle(openVideo)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              />
            </div>
          );
        })() : null}
      </Modal>
    </div>
  );
};

export default ProgramDetailLayout;
