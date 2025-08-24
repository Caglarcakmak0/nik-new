import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Space, Card, message, Modal } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  StopOutlined, 
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import TimerDisplay from './TimerDisplay';
import { createStudySession } from '../../../../services/api';
import SessionSetup, { StudySessionConfig } from './SessionSetup';
import SessionFeedback from './SessionFeedback';
import './StudyTimer.scss';
import './SessionFeedback.scss';

// StudySessionConfig'i SessionSetup'dan import ettik

interface StudyTimerProps {
  /** Timer boyutu */
  size?: 'large' | 'small';
  /** İlk konfigürasyon (opsiyonel) */
  initialConfig?: Partial<StudySessionConfig>;
  /** Session tamamlandığında callback */
  onSessionComplete?: (sessionData: any) => void;
  /** Koç programı modu */
  coachMode?: boolean;
  /** Koç programı detayları */
  coachProgram?: {
    subject: string;
    duration: number;
    description: string;
  };
}

type TimerState = 'idle' | 'running' | 'paused' | 'break' | 'completed';
type TimerMode = 'study' | 'break' | 'paused';
type MoodType = 'Enerjik' | 'Normal' | 'Yorgun' | 'Motivasyonsuz' | 'Stresli' | 'Mutlu';

interface SessionFeedbackData {
  quality: number;
  mood: MoodType;
  distractions: number;
  notes: string;
}

const StudyTimer: React.FC<StudyTimerProps> = ({ 
  size = 'large', 
  initialConfig,
  onSessionComplete,
  coachMode = false,
  coachProgram
}) => {
  // Timer state
  const [state, setState] = useState<TimerState>('idle');
  const [currentTime, setCurrentTime] = useState<number>(0); // saniye
  const [totalTime, setTotalTime] = useState<number>(0); // saniye
  const [uiMode, setUiMode] = useState<'circular' | 'digital'>('circular');
  
  // Session tracking
  const [currentSession, setCurrentSession] = useState<number>(1);
  const [completedSessions, setCompletedSessions] = useState<number>(0);
  
  // Configuration
  const [config, setConfig] = useState<StudySessionConfig>({
    technique: 'Pomodoro',
    subject: 'matematik',
    studyDuration: 25, // varsayılan 25dk
    breakDuration: 5,  // varsayılan 5dk
    targetSessions: 1, // varsayılan
    ...initialConfig
  });

  // Modal state
  const [showSetup, setShowSetup] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [pendingSessionData, setPendingSessionData] = useState<any>(null);

  // Timer reference
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  // Çalışılan süreyi saniye bazında biriktir (sadece study modunda artar)
  const accumulatedStudySecondsRef = useRef<number>(0);
  // Son aktif mod (paused iken study/break ayrımını korumak için)
  const lastActiveModeRef = useRef<TimerMode>('study');
  // Kaydedilmemiş çalışma var mı?
  const hasUnsavedWorkRef = useRef<boolean>(false);

  // Timer mode hesaplama
  const getTimerMode = (): TimerMode => {
    if (state === 'paused') return 'paused';
    if (state === 'break') return 'break';
    return 'study';
  };

  // Session info
  const getSessionInfo = () => {
    const mode = getTimerMode();
    if (mode === 'study') {
              return `${config.technique} - ${currentSession}/${config.targetSessions}`;
    } else if (mode === 'break') {
      return `☕ Mola ${currentSession}/${config.targetSessions}`;
    }
            return 'Duraklatıldı';
  };

  // Timer başlatma
  const startTimer = useCallback(() => {
    if (state === 'idle') {
      // İlk başlangıç
      const studyTimeInSeconds = config.studyDuration * 60;
      setCurrentTime(studyTimeInSeconds);
      setTotalTime(studyTimeInSeconds);
      setState('running');
      startTimeRef.current = Date.now();
      hasUnsavedWorkRef.current = true;
    } else if (state === 'paused') {
      // Devam et
      setState('running');
    }
  }, [state, config.studyDuration]);

  // Timer duraklatma
  const pauseTimer = useCallback(() => {
    if (state === 'running' || state === 'break') {
      setState('paused');
    }
  }, [state]);

  // Çalışılan dakika hesabı (biriken saniyeden)
  const getWorkedMinutes = useCallback(() => {
    const minutes = Math.max(1, Math.round(accumulatedStudySecondsRef.current / 60));
    return minutes;
  }, []);

  // Oturumu sonlandır ve kaydet
  const finalizeSession = useCallback((reason: 'completed' | 'stopped' | 'unmount') => {
    if (!hasUnsavedWorkRef.current) return;

    const workedMinutes = getWorkedMinutes();
    if (workedMinutes <= 0) {
      // Kaydedilecek anlamlı süre yok
      hasUnsavedWorkRef.current = false;
      accumulatedStudySecondsRef.current = 0;
      return;
    }

    const sessionData = {
      subject: config.subject,
      duration: workedMinutes,
      date: new Date(),
      technique: config.technique
    };

    // Her iki durumda da (tamamlandı veya manuel durdurma) kullanıcıdan geri bildirim istenir.
    // 'unmount' özel durum: sessizce kaydetmeye çalışmayacağız; veri kaybı tolere edilir.
    if (reason === 'unmount') {
      // Sessiz at: kullanıcı pencereyi kapatmış; otomatik kayıt yapmıyoruz artık.
      hasUnsavedWorkRef.current = false;
      accumulatedStudySecondsRef.current = 0;
      return;
    }

    setPendingSessionData(sessionData);
    setShowFeedback(true);
    setState('completed');
  }, [config, getWorkedMinutes, onSessionComplete]);

  // Timer durdurma (manuel): kısmi süreyi kaydet
  const stopTimer = useCallback(() => {
    // Yanlış tıklamaları önlemek için onay penceresi
    if (!hasUnsavedWorkRef.current) return;
    Modal.confirm({
      title: 'Oturumu sonlandırmak istediğinize emin misiniz?',
      content: 'Bu oturumu şimdi sonlandırırsanız kalan süre iptal edilir ve geri bildirimi doldurmanız gerekecek.',
      okText: 'Evet, Sonlandır',
      cancelText: 'Vazgeç',
      onOk: () => finalizeSession('stopped'),
    });
  }, [finalizeSession]);

  // Timer sıfırlama
  const resetTimer = useCallback(() => {
    const studyTimeInSeconds = config.studyDuration * 60;
    setCurrentTime(studyTimeInSeconds);
    setTotalTime(studyTimeInSeconds);
    setState('running');
  }, [config.studyDuration]);

  // Ayarları açma
  const openSettings = () => {
    setShowSetup(true);
  };


  // Session setup onaylandığında
  const handleSetupConfirm = (newConfig: StudySessionConfig) => {
    // Validation - 5 saniye için özel izin
    if (!newConfig.studyDuration || newConfig.studyDuration < 1 || newConfig.studyDuration > 180) {
      message.error('Çalışma süresi 5 saniye - 180 dakika arasında olmalıdır!');
      return;
    }
    
    console.log('New config received:', newConfig); // Debug log
    // Normal mod: Kullanıcı oturum sayısını belirleyebilir; Pomodoro dışı tekniklerde mola yok
    const nextConfig = newConfig.technique === 'Pomodoro'
      ? newConfig
      : { ...newConfig, breakDuration: 0 };
    setConfig(nextConfig);
    setShowSetup(false);
            message.success(`${newConfig.technique} ayarları güncellendi!`);
  };

  // Session feedback onaylandığında
  const handleFeedbackSubmit = (feedbackData: SessionFeedbackData) => {
    if (!pendingSessionData) return;

    const completeSessionData = {
      ...pendingSessionData,
      quality: feedbackData.quality,
      mood: feedbackData.mood,
      distractions: feedbackData.distractions,
      notes: feedbackData.notes
    };

    (async () => {
      try {
        const payload = {
          subject: completeSessionData.subject,
          duration: completeSessionData.duration,
          date: completeSessionData.date,
          notes: completeSessionData.notes,
          quality: completeSessionData.quality,
          technique: completeSessionData.technique,
          mood: completeSessionData.mood,
          distractions: completeSessionData.distractions
        };
        const saved = await createStudySession(payload);
        const savedSession = (saved && (saved as any).data) ? (saved as any).data : saved;
        onSessionComplete?.(savedSession);
        message.success('Oturum kaydedildi');
      } catch (e: any) {
        message.error(e?.message || 'Oturum kaydedilemedi');
      } finally {
        hasUnsavedWorkRef.current = false;
        accumulatedStudySecondsRef.current = 0;
        setShowFeedback(false);
        setPendingSessionData(null);
      }
    })();
  };

  // Feedback modal'ını kapatma
  const handleFeedbackCancel = () => {
    if (!pendingSessionData) return;
    // Kaydetmeden oturumu iptal et
    hasUnsavedWorkRef.current = false;
    accumulatedStudySecondsRef.current = 0;
    setShowFeedback(false);
    setPendingSessionData(null);
    setState('idle');
    setCurrentTime(0);
    setTotalTime(0);
    setCurrentSession(1);
    setCompletedSessions(0);
    message.info('Oturum kaydedilmedi.');
  };

  // Timer logic - useEffect
  useEffect(() => {
    if (state === 'running' || state === 'break') {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev <= 1) {
            // Zaman doldu
            if (state === 'running') {
              // Çalışma tamamlandı
              setCompletedSessions(prev => prev + 1);
              
              if (currentSession < config.targetSessions) {
                // Mola zamanı
                const breakTimeInSeconds = config.breakDuration * 60;
                setCurrentTime(breakTimeInSeconds);
                setTotalTime(breakTimeInSeconds);
                setState('break');
                message.success(`${config.technique} ${currentSession} tamamlandı! Mola zamanı.`);
                return breakTimeInSeconds;
              } else {
                // Tüm sessionlar tamamlandı
                message.success(`Tüm ${config.technique} sessionları tamamlandı!`);
                finalizeSession('completed');
                return 0;
              }
            } else if (state === 'break') {
              // Mola tamamlandı
              setCurrentSession(prev => prev + 1);
              const studyTimeInSeconds = config.studyDuration * 60;
              setCurrentTime(studyTimeInSeconds);
              setTotalTime(studyTimeInSeconds);
              setState('running');
              message.info(`☕ Mola bitti! ${config.technique} ${currentSession + 1} başlıyor.`);
              return studyTimeInSeconds;
            }
          }
          return prev - 1;
        });
        // Saniye bazında çalışma biriktir (sadece study modunda ve running iken)
        if (state === 'running' && lastActiveModeRef.current === 'study') {
          accumulatedStudySecondsRef.current += 1;
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state, currentSession, config, onSessionComplete, finalizeSession]);

  // Son aktif modu takip et
  useEffect(() => {
    if (state === 'running') {
      lastActiveModeRef.current = 'study';
    } else if (state === 'break') {
      lastActiveModeRef.current = 'break';
    }
  }, [state]);

  // Bileşen unmount olduğunda kısmi süreyi kaydet
  useEffect(() => {
    return () => {
      finalizeSession('unmount');
    };
  }, [finalizeSession]);

  // Control buttons
  const renderControls = () => {
    const isIdle = state === 'idle' || state === 'completed';
    const isRunning = state === 'running' || state === 'break';
    const isPaused = state === 'paused';

    return (
      <Space size="middle">
        {/* Start/Resume Button */}
        {(isIdle || isPaused) && (
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            size={size === 'large' ? 'large' : 'middle'}
            onClick={startTimer}
          >
            {isIdle ? 'Başlat' : 'Devam Et'}
          </Button>
        )}

        {/* Pause Button */}
        {isRunning && (
          <Button
            icon={<PauseCircleOutlined />}
            size={size === 'large' ? 'large' : 'middle'}
            onClick={pauseTimer}
          >
            Duraklat
          </Button>
        )}

        {/* Stop Button */}
        {!isIdle && (
          <Button
            danger
            icon={<StopOutlined />}
            size={size === 'large' ? 'large' : 'middle'}
            onClick={stopTimer}
          >
            Durdur
          </Button>
        )}

        {/* Reset Button */}
        {(isRunning || isPaused) && (
          <Button
            icon={<ReloadOutlined />}
            size={size === 'large' ? 'large' : 'middle'}
            onClick={resetTimer}
          >
            Sıfırla
          </Button>
        )}

        {/* Settings Button */}
        {isIdle && (
          <Button
            icon={<SettingOutlined />}
            size={size === 'large' ? 'large' : 'middle'}
            onClick={openSettings}
          >
            Ayarlar
          </Button>
        )}

      </Space>
    );
  };

  return (
    <>
      <Card 
        className={`study-timer study-timer--${size}`}
        title={size === 'large' ? getSessionInfo() : null}
        variant="borderless"
      >
        <div className="study-timer__content">
          {/* Timer Display */}
          <TimerDisplay
            currentTime={currentTime}
            totalTime={totalTime}
            isRunning={state === 'running' || state === 'break'}
            mode={getTimerMode()}
            uiMode={uiMode}
            onUiModeChange={setUiMode}
            size={size}
          />

          {/* Session Progress */}
          {size === 'large' && state !== 'idle' && (
            <div className="study-timer__progress">
              <div className="study-timer__stats">
                <span>Tamamlanan: {completedSessions}</span>
                <span>•</span>
                <span>Hedef: {config.targetSessions}</span>
                <span>•</span>
                <span>{config.subject.charAt(0).toUpperCase() + config.subject.slice(1)}</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="study-timer__controls">
            {renderControls()}
          </div>
        </div>
      </Card>

      {/* Session Setup Modal */}
      <SessionSetup
        visible={showSetup}
        onCancel={() => setShowSetup(false)}
        onConfirm={handleSetupConfirm}
        initialConfig={config}
        coachMode={coachMode}
        coachProgram={coachProgram}
      />

      {/* Session Feedback Modal */}
      <SessionFeedback
        visible={showFeedback}
        onCancel={handleFeedbackCancel}
        onSubmit={handleFeedbackSubmit}
        sessionData={pendingSessionData ? {
          subject: pendingSessionData.subject,
          technique: pendingSessionData.technique,
          duration: pendingSessionData.duration,
          targetSessions: config.targetSessions,
          completedSessions: completedSessions
        } : undefined}
      />
    </>
  );
};

export default StudyTimer;