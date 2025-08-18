import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Space, Card, message } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  StopOutlined, 
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import TimerDisplay from './TimerDisplay';
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
  onSessionComplete 
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
    targetSessions: 4, // varsayılan 4 pomodoro
    ...initialConfig
  });

  // Modal state
  const [showSetup, setShowSetup] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [pendingSessionData, setPendingSessionData] = useState<any>(null);

  // Timer reference
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

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

  // Timer durdurma
  const stopTimer = useCallback(() => {
    setState('idle');
    setCurrentTime(0);
    setTotalTime(0);
    setCurrentSession(1);
    setCompletedSessions(0);
  }, []);

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
    setConfig(newConfig);
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

    // Session data'yı callback'e gönder
    onSessionComplete?.(completeSessionData);
    
    // Modal'ı kapat ve pending data'yı temizle
    setShowFeedback(false);
    setPendingSessionData(null);
  };

  // Feedback modal'ını kapatma
  const handleFeedbackCancel = () => {
    if (!pendingSessionData) return;

    // Varsayılan değerlerle session'ı tamamla
    const completeSessionData = {
      ...pendingSessionData,
      quality: 3, // Varsayılan orta kalite
      mood: 'Normal' as MoodType,
      distractions: 0,
      notes: ''
    };

    onSessionComplete?.(completeSessionData);
    
    setShowFeedback(false);
    setPendingSessionData(null);
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
                setState('completed');
                message.success(`Tüm ${config.technique} sessionları tamamlandı!`);
                
                // Session data'yı pending olarak sakla
                const actualDuration = completedSessions * config.studyDuration; // Gerçekte tamamlanan sessionlar
                const sessionData = {
                  subject: config.subject,
                  duration: Math.max(1, actualDuration > 0 ? actualDuration : config.studyDuration), // En az 1 dakika
                  date: new Date(),
                  technique: config.technique
                };
                setPendingSessionData(sessionData);
                setShowFeedback(true);
                
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
  }, [state, currentSession, config, onSessionComplete]);

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