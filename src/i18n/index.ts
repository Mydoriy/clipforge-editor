export type Language = 'VN' | 'EN';

export const translations = {
  VN: {
    // Top / Brand
    appName: 'CapCut Desktop Web',
    guestMode: 'Khách (Offline)',
    signIn: 'Đăng nhập',
    joinPro: 'Nâng cấp Pro',
    proBadge: 'PRO',
    
    // Sidebar
    navHome: 'Trang chủ',
    navTemplates: 'Mẫu video',
    navVideoStudio: 'Video Studio',
    navDesignStudio: 'Design Studio',
    navMarketingTools: 'Công cụ Marketing',
    navCreateWithAi: 'Tạo bằng AI',
    navLibrary: 'Thư viện của tôi',
    navTrash: 'Thùng rác',
    navCloudSync: 'Đồng bộ Cloud',
    
    // Home Dashboard
    heroCreateProject: 'Tạo dự án mới',
    editPilotPlaceholder: 'Bạn muốn biên tập video như thế nào hôm nay?',
    askAi: 'Gửi',
    quickAiImage: 'Tạo ảnh AI',
    quickAiImageDesc: 'Ý tưởng thành hình ảnh 9:16',
    quickExtendVideo: 'Kéo dài video',
    quickExtendVideoDesc: 'Mở rộng clip mượt mà',
    quickAiEdit: 'AI chỉnh sửa',
    quickAiEditDesc: 'Tự động cắt ghép thông minh',
    quickEnhanceQuality: 'Nâng chất lượng',
    quickEnhanceQualityDesc: 'Khử noise, tăng nét HD',
    
    // Creative suite
    aiCreativeSuite: 'Bộ công cụ sáng tạo AI',
    videoStudioCard: 'Video Studio',
    videoStudioCardDesc: 'Tạo video ngắn 30s với AI Generator',
    designStudioCard: 'Design Studio',
    designStudioCardDesc: 'Thiết kế thumbnail, poster 9:16 trên Canvas',
    aiAdMakerCard: 'Tạo quảng cáo AI',
    aiAdMakerCardDesc: 'Chuyển đổi kịch bản thành ads bán hàng',
    longToShortsCard: 'Video dài thành Shorts',
    longToShortsCardDesc: 'Tự động trích đoạn viral tỷ lệ 9:16',
    
    // Projects
    projectsTitle: 'Dự án gần đây',
    searchProjects: 'Tìm kiếm dự án...',
    projectSync: 'Đồng bộ',
    trashTitle: 'Thùng rác',
    trashEmpty: 'Thùng rác đang trống',
    restore: 'Khôi phục',
    deletePermanent: 'Xóa vĩnh viễn',
    noProjects: 'Chưa có dự án nào. Bấm "+ Tạo dự án mới" để bắt đầu!',
    durationUnit: 'giây',
    
    // Editor Header
    menu: 'Menu',
    safeZone: 'Vùng an toàn 9:16',
    export: 'Xuất video',
    share: 'Chia sẻ',
    
    // Editor Tabs
    tabMedia: 'Media',
    tabAudio: 'Âm thanh',
    tabText: 'Văn bản',
    tabStickers: 'Stickers',
    tabEffects: 'Hiệu ứng',
    tabTransitions: 'Chuyển cảnh',
    tabCaptions: 'Phụ đề',
    tabHookLab: 'Hook Lab',
    tabShapes: 'Hình khối',
    tabParticles: 'Hiệu ứng hạt',
    tabAiVoice: 'Giọng đọc AI',
    tabTemplates: 'Mẫu',
    
    // Inspector & Timeline
    inspectorTitle: 'Chi tiết',
    scale: 'Thu phóng',
    position: 'Vị trí',
    rotation: 'Góc xoay',
    opacity: 'Độ mờ',
    speed: 'Tốc độ',
    volume: 'Âm lượng',
    split: 'Tách clip',
    delete: 'Xóa',
    undo: 'Hoàn tác',
    redo: 'Làm lại',
    addTrack: 'Thêm track',
    exporting: 'Đang xuất video...',
    exportSuccess: 'Xuất video thành công!',
    
    // EditPilot AI
    editPilotName: 'EditPilot AI',
    aiSuggestedPrompt1: 'Thêm hook giật gân ở 3 giây đầu',
    aiSuggestedPrompt2: 'Tự động tạo phụ đề phong cách Alex Hormozi',
    aiSuggestedPrompt3: 'Áp dụng bộ lọc màu Cinematic & tăng tốc 1.2x',
    aiExecuting: 'Đang thực hiện lệnh...'
  },
  EN: {
    // Top / Brand
    appName: 'CapCut Desktop Web',
    guestMode: 'Guest (Offline)',
    signIn: 'Sign In',
    joinPro: 'Join Pro',
    proBadge: 'PRO',
    
    // Sidebar
    navHome: 'Home',
    navTemplates: 'Templates',
    navVideoStudio: 'Video Studio',
    navDesignStudio: 'Design Studio',
    navMarketingTools: 'Marketing Tools',
    navCreateWithAi: 'Create with AI',
    navLibrary: 'Library',
    navTrash: 'Trash',
    navCloudSync: 'Cloud Sync',
    
    // Home Dashboard
    heroCreateProject: 'Create project',
    editPilotPlaceholder: 'How can I help you edit today?',
    askAi: 'Send',
    quickAiImage: 'AI Image',
    quickAiImageDesc: 'Turn ideas into 9:16 imagery',
    quickExtendVideo: 'Extend video',
    quickExtendVideoDesc: 'Seamlessly extend any clip',
    quickAiEdit: 'AI edit',
    quickAiEditDesc: 'Edit clips by describing it',
    quickEnhanceQuality: 'Enhance quality',
    quickEnhanceQualityDesc: 'Get sharper 4K HD results',
    
    // Creative suite
    aiCreativeSuite: 'AI-powered creative suite',
    videoStudioCard: 'Video Studio',
    videoStudioCardDesc: 'Make 30-second videos with AI generator',
    designStudioCard: 'Design Studio',
    designStudioCardDesc: 'Design 9:16 thumbnails & posters on Canvas',
    aiAdMakerCard: 'AI ad maker',
    aiAdMakerCardDesc: 'Create winning ads, scale fast with variants',
    longToShortsCard: 'Long video to shorts',
    longToShortsCardDesc: 'Turn long videos into polished shorts',
    
    // Projects
    projectsTitle: 'Projects',
    searchProjects: 'Search projects...',
    projectSync: 'Project sync',
    trashTitle: 'Trash',
    trashEmpty: 'Trash is empty',
    restore: 'Restore',
    deletePermanent: 'Delete permanently',
    noProjects: 'No projects yet. Click "+ Create project" to start!',
    durationUnit: 'sec',
    
    // Editor Header
    menu: 'Menu',
    safeZone: '9:16 Safe Zone',
    export: 'Export',
    share: 'Share',
    
    // Editor Tabs
    tabMedia: 'Media',
    tabAudio: 'Audio',
    tabText: 'Text',
    tabStickers: 'Stickers',
    tabEffects: 'Effects',
    tabTransitions: 'Transitions',
    tabCaptions: 'Captions',
    tabHookLab: 'Hook Lab',
    tabShapes: 'Shapes',
    tabParticles: 'Particles',
    tabAiVoice: 'AI Voice',
    tabTemplates: 'Templates',
    
    // Inspector & Timeline
    inspectorTitle: 'Details',
    scale: 'Scale',
    position: 'Position',
    rotation: 'Rotation',
    opacity: 'Opacity',
    speed: 'Speed',
    volume: 'Volume',
    split: 'Split',
    delete: 'Delete',
    undo: 'Undo',
    redo: 'Redo',
    addTrack: 'Add track',
    exporting: 'Exporting video...',
    exportSuccess: 'Export completed!',
    
    // EditPilot AI
    editPilotName: 'EditPilot AI',
    aiSuggestedPrompt1: 'Add a viral hook in the first 3 seconds',
    aiSuggestedPrompt2: 'Generate Alex Hormozi style kinetic captions',
    aiSuggestedPrompt3: 'Apply Cinematic color grade & 1.2x speed',
    aiExecuting: 'Executing action...'
  }
};
