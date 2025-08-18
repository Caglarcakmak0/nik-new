import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Card, Spin, Typography } from 'antd';
import { getMyCoach, getCoachFeedbackStatus } from '../../services/api';
import CoachProfile from './CoachProfile';
import SecretFeedbackForm from '../../components/student/FeedbackForm/SecretFeedbackForm';
import StudentPrograms from './StudentPrograms';
import StudentCoachTour from '../../components/tour/StudentTour/StudentCoachTour';
import { useAuth } from '../../contexts/AuthContext';
import './StudentCoachPage.scss';

const { Title, Text } = Typography;

export const StudentCoachPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [coach, setCoach] = useState<{ id: string; name: string; email: string; avatar?: string | null; bio?: string; assignedAt: string | Date } | null>(null);
  const [status, setStatus] = useState<{ dueThisMonth: boolean; coachId: string | null; lastSubmittedAt: string | null; countThisMonth: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const programsRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [coachRes, statusRes] = await Promise.all([getMyCoach(), getCoachFeedbackStatus()]);
      setCoach(coachRes.coach);
      setStatus(statusRes);
    } catch (e) {
      // noop - apiRequest already throws; UI minimal
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const banner = useMemo(() => {
    if (!coach || !status) return null;
    if (status.dueThisMonth) {
      return (
        <Alert
          type="warning"
          message="Aylık koç değerlendirmesi bekleniyor"
          description={
            <span>
              Bu ay henüz değerlendirme göndermediniz. Lütfen koçunuzu değerlendirin.
              {status.lastSubmittedAt && (
                <>
                  <br />
                  <Text type="secondary">Son gönderim: {new Date(status.lastSubmittedAt).toLocaleDateString('tr-TR')} · Bu ay: {status.countThisMonth} kez</Text>
                </>
              )}
            </span>
          }
          showIcon
          action={<a onClick={() => setModalOpen(true)}>Değerlendirme Yap</a>}
          style={{ marginBottom: 16 }}
        />
      );
    }
    return (
      <Alert
        type="success"
        message="Teşekkürler!"
        description={
          <span>
            Bu ay koç değerlendirmesini tamamladınız. İsterseniz tekrar değerlendirme gönderebilirsiniz.
            {status.lastSubmittedAt && (
              <>
                <br />
                <Text type="secondary">Son gönderim: {new Date(status.lastSubmittedAt).toLocaleDateString('tr-TR')} · Bu ay: {status.countThisMonth} kez</Text>
              </>
            )}
          </span>
        }
        showIcon
        style={{ marginBottom: 16 }}
      />
    );
  }, [coach, status]);

  if (loading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  if (!coach) {
    return (
      <Card>
        <Title level={5}>Aktif koç bulunamadı</Title>
        <Text type="secondary">Admin tarafından bir koç atandığında burada görünecek.</Text>
      </Card>
    );
  }

  return (
    <div className="student-coach-page">
      {banner}
      <div ref={profileRef as any} className="coach-profile-section">
        <CoachProfile
          coachName={coach.name}
          coachEmail={coach.email}
          coachAvatar={coach.avatar || null}
          coachBio={coach.bio}
          assignedAt={coach.assignedAt}
          onOpenFeedback={() => setModalOpen(true)}
        />
      </div>
      <div style={{ marginTop: 16 }} ref={programsRef as any} className="programs-section">
        <StudentPrograms />
      </div>
      <SecretFeedbackForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        coachId={coach.id}
        coachName={coach.name}
        onSubmitted={load}
      />
      <StudentCoachTour
        userId={user?._id}
        targets={{
          getBannerEl: () => (bannerRef.current as any) || document.querySelector('.ant-alert') as HTMLElement | null,
          getProfileEl: () => (profileRef.current as any) || null,
          getProgramsEl: () => (programsRef.current as any) || null,
        }}
      />
    </div>
  );
};

export default StudentCoachPage;


