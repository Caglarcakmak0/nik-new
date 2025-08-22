export const getUniversityImages = (universityName: string): string[] => {
	const universityImages: { [key: string]: string[] } = {
		'İTÜ': [
			'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=800&fit=crop'
		],
		'İstanbul Teknik Üniversitesi': [
			'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=800&fit=crop'
		],
		
		'Boğaziçi Üniversitesi': [
			'https://r.resimlink.com/3i8Bt7bokyn.webp',
		],
		'ODTÜ': [
			'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=800&fit=crop'
		],
		'Orta Doğu Teknik Üniversitesi': [
			'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=800&fit=crop'
		],
		'İstanbul Üniversitesi': [
			'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=800&fit=crop'
		],
		'Ankara Üniversitesi': [
			'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=800&fit=crop'
		],
		'Hacettepe': [
			'https://images.unsplash.com/photo-1569467701197-ddac4b2c605a?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=800&fit=crop'
		],
		'Hacettepe Üniversitesi': [
			'https://images.unsplash.com/photo-1569467701197-ddac4b2c605a?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=800&fit=crop'
		],
		'Gazi': [
			'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=800&fit=crop'
		],
		'Bilkent': [
			'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=800&fit=crop'
		],
		'Koç': [
			'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=1200&h=800&fit=crop'
		],
		'Sabancı': [
			'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=1200&h=800&fit=crop'
		],
		'Galatasaray': [
			'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=800&fit=crop'
		],
		'Yıldız Teknik': [
			'https://images.unsplash.com/photo-1569467701197-ddac4b2c605a?w=1200&h=800&fit=crop',
			'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=800&fit=crop'
		]
	};

	for (const [key, images] of Object.entries(universityImages)) {
		if (universityName.toLowerCase().includes(key.toLowerCase())) {
			return images;
		}
	}

	// Varsayılan görseller (eşleşme olmazsa)
	return [
		'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=800&fit=crop',
		'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=800&fit=crop'
	];
};

const isLikelyImageUrl = (url: string): boolean => {
	// İmaj uzantısı veya bilinen CDN/domain kalıpları
	const hasImageExtension = /(\.png|\.jpg|\.jpeg|\.webp|\.gif|\.svg)(\?.*)?$/i.test(url);
	const isKnownImageCdn = url.includes('images.unsplash.com') || url.includes('mediastore.cc.bogazici.edu.tr') || url.startsWith('data:image/');
	// ibb.co sayfa linklerini ele
	const isIbbPage = /(^|\.)ibb\.co\//.test(url) && !/(^|\.)i\.ibb\.co\//.test(url);
	return !isIbbPage && (hasImageExtension || isKnownImageCdn);
};

export const getRandomUniversityImage = (universityName: string): string => {
	const list = getUniversityImages(universityName);
	const candidates = list.filter(isLikelyImageUrl);
	const safeList = candidates.length > 0 ? candidates : [
		'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=800&fit=crop',
		'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=800&fit=crop'
	];
	return safeList[Math.floor(Math.random() * safeList.length)];
};
