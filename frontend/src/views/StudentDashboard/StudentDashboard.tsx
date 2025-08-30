import React, { useEffect, useState } from 'react';
import AISuggestionsPanel from '../../components/AISuggestions/AISuggestionsPanel';
import { apiRequest } from '../../services/api';
import dayjs from 'dayjs';

interface QuickStat { label:string; value:string; }

const StatCard: React.FC<QuickStat> = ({ label, value }) => (
	<div style={{ background:'#fff', border:'1px solid #eee', borderRadius:8, padding:12, display:'flex', flexDirection:'column', gap:4 }}>
		<span style={{ fontSize:12, fontWeight:500, color:'#666' }}>{label}</span>
		<span style={{ fontSize:20, fontWeight:600 }}>{value}</span>
	</div>
);

const StudentDashboard: React.FC = () => {
	const [stats, setStats] = useState<QuickStat[]>([]);
	useEffect(()=>{
		(async ()=>{
			try {
				// Minimal placeholder: attempt to fetch overview stats if exists else skip
				let overview:any=null;
				try { overview = await apiRequest('/exam-attempts/stats/overview'); } catch { /* ignore */ }
				if(overview?.data){
					const d = overview.data;
					setStats([
						{ label:'Son Deneme Başarı', value: `%${Math.round(d.lastAccuracy*100)}` },
						{ label:'Ortalama Başarı', value: `%${Math.round(d.averageAccuracy*100)}` },
						{ label:'Toplam Deneme', value: String(d.count) },
					]);
				} else {
					setStats([
						{ label:'Hafta', value: dayjs().format('WW') },
						{ label:'Tarih', value: dayjs().format('DD MMM') },
						{ label:'Durum', value: 'Hazır' }
					]);
				}
			} catch { /* noop */ }
		})();
	},[]);

	return (
		<div style={{ padding:16, display:'flex', flexDirection:'column', gap:24 }}>
			<header style={{ display:'flex', justifyContent:'space-between', gap:24, flexWrap:'wrap' }}>
				<div style={{ flex:'1 1 300px' }}>
					<h1 style={{ margin:'0 0 4px', fontSize:28, fontWeight:600 }}>Öğrenci Paneli</h1>
					<p style={{ margin:0, color:'#555' }}>Genel ilerlemeyi ve AI önerilerini burada takip et.</p>
				</div>
				<div style={{ width:280, flex:'0 0 auto' }}>
					<AISuggestionsPanel scope="dashboard" />
				</div>
			</header>
			<section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:16 }}>
				{stats.map(s=> <StatCard key={s.label} {...s} />)}
			</section>
		</div>
	);
};

export default StudentDashboard;
