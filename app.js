// RECO AI - 智慧會議紀錄與筆記助理前端核心

// ==================== 全域變數 ====================
let currentMeeting = null;       // 當前選中的會議紀錄對象
let chatHistory = [];            // AI 對話歷史
let mediaRecorder = null;        // 錄音對象
let audioChunks = [];            // 錄音音訊區塊
let recordingStartTime = 0;      // 錄音開始時間
let recordingTimerInterval = null; // 錄音計時器
let audioContext = null;         // 用於音波可視化
let analyserNode = null;         // 音頻分析器
let canvasContext = null;        // 音波畫布
let visualizerAnimationId = null; // 音波動畫幀 ID
let wakeLock = null;             // 螢幕 Wake Lock 鎖定器
let pendingLargeFile = null;     // 待壓縮的大音訊檔案


// ==================== DOM 元素 ====================
const el = {
  // 側邊欄與導覽
  sidebar: document.getElementById('sidebar'),
  closeSidebarBtn: document.getElementById('closeSidebarBtn'),
  menuToggleBtn: document.getElementById('menuToggleBtn'),
  newMeetingBtn: document.getElementById('newMeetingBtn'),
  goHomeBtn: document.getElementById('goHomeBtn'),
  logo: document.querySelector('.logo'),
  mobileLogo: document.querySelector('.mobile-logo'),
  mobileAssistantBtn: document.getElementById('mobileAssistantBtn'),
  closeAssistantBtn: document.getElementById('closeAssistantBtn'),
  instructionsModal: document.getElementById('instructionsModal'),
  instructionsBtn: document.getElementById('instructionsBtn'),
  closeInstructionsModalBtn: document.getElementById('closeInstructionsModalBtn'),
  closeInstructionsBtn: document.getElementById('closeInstructionsBtn'),
  meetingCount: document.getElementById('meetingCount'),
  searchMeetingsInput: document.getElementById('searchMeetingsInput'),
  meetingList: document.getElementById('meetingList'),
  settingsBtn: document.getElementById('settingsBtn'),
  mobileSettingsBtn: document.getElementById('mobileSettingsBtn'),

  // 主內容面板
  mainContent: document.getElementById('mainContent'),
  welcomeView: document.getElementById('welcomeView'),
  detailView: document.getElementById('detailView'),
  actionRecord: document.getElementById('actionRecord'),
  actionUpload: document.getElementById('actionUpload'),

  // 會議詳情
  meetingTitleInput: document.getElementById('meetingTitleInput'),
  meetingDateText: document.getElementById('meetingDateText'),
  exportBtn: document.getElementById('exportBtn'),
  deleteMeetingBtn: document.getElementById('deleteMeetingBtn'),

  // 音訊控制
  recordingState: document.getElementById('recordingState'),
  visualizerCanvas: document.getElementById('visualizerCanvas'),
  recordingTimer: document.getElementById('recordingTimer'),
  pauseRecordBtn: document.getElementById('pauseRecordBtn'),
  stopRecordBtn: document.getElementById('stopRecordBtn'),
  playerState: document.getElementById('playerState'),
  audioPlayer: document.getElementById('audioPlayer'),
  audioFileName: document.getElementById('audioFileName'),
  noAudioState: document.getElementById('noAudioState'),
  fileUploadInput: document.getElementById('fileUploadInput'),

  // 逐字稿與摘要
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  transcribeStatusBanner: document.getElementById('transcribeStatusBanner'),
  transcribeStatusText: document.getElementById('transcribeStatusText'),
  transcribeProgressDetail: document.getElementById('transcribeProgressDetail'),
  transcriptControls: document.getElementById('transcriptControls'),
  languageHintSelect: document.getElementById('languageHintSelect'),
  reTranscribeBtn: document.getElementById('reTranscribeBtn'),
  transcriptContainer: document.getElementById('transcriptContainer'),
  aiSummaryText: document.getElementById('aiSummaryText'),
  aiActionItemsText: document.getElementById('aiActionItemsText'),
  regenerateSummaryBtn: document.getElementById('regenerateSummaryBtn'),

  // 助理面板
  assistantPanel: document.getElementById('assistantPanel'),
  assistantTabButtons: document.querySelectorAll('.assistant-tab-btn'),
  assistantPanes: document.querySelectorAll('.assistant-pane'),
  noteCount: document.getElementById('noteCount'),
  chatMessages: document.getElementById('chatMessages'),
  chatInput: document.getElementById('chatInput'),
  sendChatBtn: document.getElementById('sendChatBtn'),
  noteInput: document.getElementById('noteInput'),
  addNoteBtn: document.getElementById('addNoteBtn'),
  notesList: document.getElementById('notesList'),

  // Modal 彈出視窗
  settingsModal: document.getElementById('settingsModal'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  modelSelect: document.getElementById('modelSelect'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),

  // 鎖屏偽裝
  lockRecordBtn: document.getElementById('lockRecordBtn'),
  fakeLockScreen: document.getElementById('fakeLockScreen'),
  lockScreenTime: document.getElementById('lockScreenTime'),
  lockScreenDate: document.getElementById('lockScreenDate'),

  exportOnepageBtn: document.getElementById('exportOnepageBtn'),
  iosVoiceMemoModal: document.getElementById('iosVoiceMemoModal'),
  iosVoiceMemoGuideBtn: document.getElementById('iosVoiceMemoGuideBtn'),
  closeIosVoiceMemoModalBtn: document.getElementById('closeIosVoiceMemoModalBtn'),
  closeIosVoiceMemoBtn: document.getElementById('closeIosVoiceMemoBtn'),
  audioLimitModal: document.getElementById('audioLimitModal'),
  uploadFileSizeText: document.getElementById('uploadFileSizeText'),
  closeAudioLimitModalBtn: document.getElementById('closeAudioLimitModalBtn'),
  closeAudioLimitBtn: document.getElementById('closeAudioLimitBtn'),
  compressedSizeEstText: document.getElementById('compressedSizeEstText'),
  compressProgressWrapper: document.getElementById('compressProgressWrapper'),
  compressProgressText: document.getElementById('compressProgressText'),
  compressPercentText: document.getElementById('compressPercentText'),
  compressProgressBar: document.getElementById('compressProgressBar'),
  startAutoCompressBtn: document.getElementById('startAutoCompressBtn')
};

// ==================== 頁面初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
  // 阻擋 iOS 系統縮放手勢與多指縮放
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  // 初始化畫布尺寸
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // 載入 API Key 與模型設定
  try {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      if (el.apiKeyInput) el.apiKeyInput.value = savedKey;
    } else {
      // 第一次使用，主動彈出設定框
      showSettingsModal();
    }
    const savedModel = localStorage.getItem('gemini_model');
    if (savedModel && el.modelSelect) {
      el.modelSelect.value = savedModel;
    }
  } catch (e) {
    console.warn('無法讀取 localStorage 設定 (可能受瀏覽器安全限制):', e);
  }

  // 載入會議清單 (非同步執行，避免 IndexedDB 讀取阻塞事件監聽器註冊)
  refreshMeetingList().catch(err => console.error('載入會議清單失敗:', err));
  
  // 立即註冊所有事件監聽器以確保介面功能正常
  setupEventListeners();

  // 註冊 PWA Service Worker (支援手機端「加入主畫面」離線使用與 App 體驗)
  try {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .then(reg => {
            console.log('PWA Service Worker 註冊成功:', reg.scope);
            
            // 監聽是否有新的 Service Worker 正在安裝中
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed') {
                    if (navigator.serviceWorker.controller) {
                      // 新的 Service Worker 已經下載並安裝完畢，提示使用者重新載入
                      console.log('新版本已就緒，提示更新...');
                      showToast('偵測到系統新版本！正在自動更新...', 'success');
                      setTimeout(() => {
                        window.location.reload();
                      }, 1500);
                    }
                  }
                });
              }
            });
          })
          .catch(err => console.error('PWA Service Worker 註冊失敗:', err));
      });
      
      // 監聽 Controller 變化，確保新 Service Worker 啟用後自動重新載入頁面
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  } catch (swErr) {
    console.warn('無法註冊 Service Worker:', swErr);
  }
});

// ==================== 事件綁定 ====================
function setupEventListeners() {
  // 側邊欄控制
  if (el.menuToggleBtn) el.menuToggleBtn.addEventListener('click', () => el.sidebar && el.sidebar.classList.add('active'));
  if (el.closeSidebarBtn) el.closeSidebarBtn.addEventListener('click', () => el.sidebar && el.sidebar.classList.remove('active'));
  
  // 返回首頁
  if (el.goHomeBtn) el.goHomeBtn.addEventListener('click', showWelcomeView);
  if (el.logo) el.logo.addEventListener('click', showWelcomeView);
  if (el.mobileLogo) el.mobileLogo.addEventListener('click', showWelcomeView);

  // 新增會議
  if (el.newMeetingBtn) el.newMeetingBtn.addEventListener('click', createNewMeetingOffline);
  if (el.actionRecord) el.actionRecord.addEventListener('click', startRecordingWorkflow);
  if (el.actionUpload) el.actionUpload.addEventListener('click', () => el.fileUploadInput && el.fileUploadInput.click());
  if (el.fileUploadInput) el.fileUploadInput.addEventListener('change', handleFileUpload);

  // 手機版 AI 助理側邊欄控制
  if (el.mobileAssistantBtn) {
    el.mobileAssistantBtn.addEventListener('click', () => {
      if (el.assistantPanel) el.assistantPanel.classList.toggle('active');
    });
  }
  if (el.closeAssistantBtn) {
    el.closeAssistantBtn.addEventListener('click', () => {
      if (el.assistantPanel) el.assistantPanel.classList.remove('active');
    });
  }

  // 使用說明 Modal
  if (el.instructionsBtn) el.instructionsBtn.addEventListener('click', showInstructionsModal);
  if (el.closeInstructionsModalBtn) el.closeInstructionsModalBtn.addEventListener('click', hideInstructionsModal);
  if (el.closeInstructionsBtn) el.closeInstructionsBtn.addEventListener('click', hideInstructionsModal);
  
  // 點擊 Modal 外側關閉
  if (el.instructionsModal) {
    el.instructionsModal.addEventListener('click', (e) => {
      if (e.target === el.instructionsModal) hideInstructionsModal();
    });
  }

  // 搜尋會議
  if (el.searchMeetingsInput) el.searchMeetingsInput.addEventListener('input', filterMeetings);

  // 設定 Modal
  if (el.settingsBtn) el.settingsBtn.addEventListener('click', showSettingsModal);
  if (el.mobileSettingsBtn) el.mobileSettingsBtn.addEventListener('click', showSettingsModal);
  if (el.closeModalBtn) el.closeModalBtn.addEventListener('click', hideSettingsModal);
  if (el.cancelSettingsBtn) el.cancelSettingsBtn.addEventListener('click', hideSettingsModal);
  if (el.saveSettingsBtn) el.saveSettingsBtn.addEventListener('click', saveSettings);

  // 點擊 Modal 外側關閉
  if (el.settingsModal) {
    el.settingsModal.addEventListener('click', (e) => {
      if (e.target === el.settingsModal) hideSettingsModal();
    });
  }

  // 會議詳情互動
  if (el.meetingTitleInput) {
    el.meetingTitleInput.addEventListener('blur', saveCurrentMeetingTitle);
    el.meetingTitleInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') el.meetingTitleInput.blur();
    });
  }
  if (el.deleteMeetingBtn) el.deleteMeetingBtn.addEventListener('click', deleteCurrentMeeting);
  if (el.exportBtn) el.exportBtn.addEventListener('click', exportMeetingData);

  // 分頁切換 (逐字稿 / AI 摘要)
  if (el.tabButtons) {
    el.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (el.tabButtons) el.tabButtons.forEach(b => b.classList.remove('active'));
        if (el.tabPanes) el.tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const paneId = btn.getAttribute('data-tab');
        const pane = document.getElementById(paneId);
        if (pane) pane.classList.add('active');
      });
    });
  }

  // 助理面板分頁切換
  if (el.assistantTabButtons) {
    el.assistantTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (el.assistantTabButtons) el.assistantTabButtons.forEach(b => b.classList.remove('active'));
        if (el.assistantPanes) el.assistantPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const paneId = btn.getAttribute('data-assistant-tab');
        const targetPane = document.getElementById(paneId === 'tabChat' ? 'assistantTabChat' : 'assistantTabNotes');
        if (targetPane) targetPane.classList.add('active');
      });
    });
  }

  // AI 轉譯 / 重新生成
  if (el.reTranscribeBtn) el.reTranscribeBtn.addEventListener('click', triggerTranscription);
  if (el.regenerateSummaryBtn) el.regenerateSummaryBtn.addEventListener('click', triggerSummaryGeneration);

  // AI Chat 對話
  if (el.sendChatBtn) el.sendChatBtn.addEventListener('click', sendChatMessage);
  if (el.chatInput) {
    el.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  // 筆記卡片
  if (el.addNoteBtn) el.addNoteBtn.addEventListener('click', addNewNoteCard);
  if (el.noteInput) {
    el.noteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addNewNoteCard();
      }
    });
  }

  // 錄音控制
  if (el.pauseRecordBtn) el.pauseRecordBtn.addEventListener('click', togglePauseRecording);
  if (el.stopRecordBtn) el.stopRecordBtn.addEventListener('click', stopRecording);

  // 鎖屏偽裝
  if (el.lockRecordBtn) {
    el.lockRecordBtn.addEventListener('click', activateFakeLockScreen);
  }
  setupLockScreenSwipeGesture();


  if (el.exportOnepageBtn) {
    el.exportOnepageBtn.addEventListener('click', exportOnepageToPdf);
  }

  // iOS 語音備忘錄教學彈窗
  if (el.iosVoiceMemoGuideBtn) {
    el.iosVoiceMemoGuideBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showIosVoiceMemoModal();
    });
  }
  if (el.closeIosVoiceMemoModalBtn) {
    el.closeIosVoiceMemoModalBtn.addEventListener('click', hideIosVoiceMemoModal);
  }
  if (el.closeIosVoiceMemoBtn) {
    el.closeIosVoiceMemoBtn.addEventListener('click', hideIosVoiceMemoModal);
  }
  if (el.iosVoiceMemoModal) {
    el.iosVoiceMemoModal.addEventListener('click', (e) => {
      if (e.target === el.iosVoiceMemoModal) hideIosVoiceMemoModal();
    });
  }

  // 檔案大小超限提示彈窗事件
  if (el.closeAudioLimitModalBtn) {
    el.closeAudioLimitModalBtn.addEventListener('click', hideAudioLimitModal);
  }
  if (el.closeAudioLimitBtn) {
    el.closeAudioLimitBtn.addEventListener('click', hideAudioLimitModal);
  }
  if (el.audioLimitModal) {
    el.audioLimitModal.addEventListener('click', (e) => {
      if (e.target === el.audioLimitModal) hideAudioLimitModal();
    });
  }
  if (el.startAutoCompressBtn) {
    el.startAutoCompressBtn.addEventListener('click', startAudioCompression);
  }

  // 監聽列印完成事件，自動還原樣式
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-mode-slides', 'print-mode-onepage');
  });
}

// ==================== Modal 視窗控制 ====================
function showSettingsModal() {
  el.settingsModal.classList.add('active');
}

function hideSettingsModal() {
  el.settingsModal.classList.remove('active');
}

function showInstructionsModal() {
  el.instructionsModal.classList.add('active');
}

function hideInstructionsModal() {
  el.instructionsModal.classList.remove('active');
}

function showIosVoiceMemoModal() {
  if (el.iosVoiceMemoModal) {
    el.iosVoiceMemoModal.classList.add('active');
  }
}

function hideIosVoiceMemoModal() {
  if (el.iosVoiceMemoModal) {
    el.iosVoiceMemoModal.classList.remove('active');
  }
}

async function showAudioLimitModal(sizeMb) {
  if (el.uploadFileSizeText) {
    el.uploadFileSizeText.textContent = sizeMb.toFixed(1);
  }
  
  // 重置壓縮按鈕與狀態
  resetCompressButton();
  
  if (el.audioLimitModal) {
    el.audioLimitModal.classList.add('active');
  }
  
  // 計算長度並估算壓縮後大小
  if (pendingLargeFile) {
    if (el.compressedSizeEstText) {
      el.compressedSizeEstText.textContent = '計算中...';
    }
    const duration = await getAudioDuration(pendingLargeFile);
    if (duration > 0) {
      let sampleRate = 16000;
      let use8Bit = false;
      
      const size16k16b = duration * 16000 * 2;
      const size8k16b = duration * 8000 * 2;
      const size8k8b = duration * 8000 * 1;
      const size6k8b = duration * 6000 * 1;
      const size4k8b = duration * 4000 * 1;
      
      if (size16k16b <= 15000000) {
        sampleRate = 16000;
        use8Bit = false;
      } else if (size8k16b <= 15000000) {
        sampleRate = 8000;
        use8Bit = false;
      } else if (size8k8b <= 15000000) {
        sampleRate = 8000;
        use8Bit = true;
      } else if (size6k8b <= 15000000) {
        sampleRate = 6000;
        use8Bit = true;
      } else {
        sampleRate = 4000;
        use8Bit = true;
      }
      
      const estSizeMb = (duration * sampleRate * (use8Bit ? 1 : 2)) / (1024 * 1024);
      if (el.compressedSizeEstText) {
        el.compressedSizeEstText.textContent = estSizeMb.toFixed(1);
      }
      
      // 如果音訊長度大於 90 分鐘 (5400秒)，為避免裝置記憶體不足崩潰，停用自動壓縮
      if (duration > 5400) {
        if (el.startAutoCompressBtn) {
          el.startAutoCompressBtn.disabled = true;
          el.startAutoCompressBtn.innerHTML = '<i class="fa-solid fa-circle-info"></i> 音訊長度大於 90 分鐘，請手動壓縮';
          el.startAutoCompressBtn.style.background = 'var(--text-muted)';
        }
        if (el.compressedSizeEstText) {
          el.compressedSizeEstText.textContent = '--';
        }
      }
    } else {
      if (el.compressedSizeEstText) {
        el.compressedSizeEstText.textContent = '未知';
      }
    }
  }
}

function hideAudioLimitModal() {
  if (el.audioLimitModal) {
    el.audioLimitModal.classList.remove('active');
  }
  pendingLargeFile = null;
}

// ==================== 音訊自動壓縮處理相關函數 ====================

/**
 * 取得音訊檔案的播放長度 (秒)
 */
function getAudioDuration(file) {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(0); // 載入失敗
    });
  });
}

/**
 * 使用 OfflineAudioContext 在瀏覽器本地進行高效重取樣與單聲道混音
 */
async function resampleAudioBuffer(audioBuffer, targetSampleRate) {
  const numberOfChannels = 1; // 強制轉為單聲道 Mono
  const duration = audioBuffer.duration;
  const offlineCtx = new OfflineAudioContext(
    numberOfChannels,
    Math.round(targetSampleRate * duration),
    targetSampleRate
  );
  
  const bufferSource = offlineCtx.createBufferSource();
  bufferSource.buffer = audioBuffer;
  bufferSource.connect(offlineCtx.destination);
  bufferSource.start();
  
  const renderedBuffer = await offlineCtx.startRendering();
  return renderedBuffer;
}

/**
 * 將 AudioBuffer 編碼為標準 16-bit 或 8-bit WAV 格式之二進位 Blob
 */
function audioBufferToWav(buffer, use8Bit = false) {
  const sampleRate = buffer.sampleRate;
  const numChannels = 1; // 單聲道
  const bytesPerSample = use8Bit ? 1 : 2;
  const samples = buffer.getChannelData(0);
  const bufferLength = samples.length * bytesPerSample;
  const wavBuffer = new ArrayBuffer(44 + bufferLength);
  const view = new DataView(wavBuffer);
  
  /* RIFF 識別碼 */
  writeString(view, 0, 'RIFF');
  /* 檔案長度 */
  view.setUint32(4, 36 + bufferLength, true);
  /* RIFF 類型 */
  writeString(view, 8, 'WAVE');
  /* fmt 格式區塊識別碼 */
  writeString(view, 12, 'fmt ');
  /* 格式區塊大小 */
  view.setUint32(16, 16, true);
  /* 音訊格式 (1 代表未壓縮 PCM) */
  view.setUint16(20, 1, true);
  /* 聲道數 */
  view.setUint16(22, numChannels, true);
  /* 取樣率 */
  view.setUint32(24, sampleRate, true);
  /* 每秒位元組率 */
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  /* 區塊對齊 */
  view.setUint16(32, numChannels * bytesPerSample, true);
  /* 取樣位元數 */
  view.setUint16(34, bytesPerSample * 8, true);
  /* data 資料區塊識別碼 */
  writeString(view, 36, 'data');
  /* 資料區塊大小 */
  view.setUint32(40, bufferLength, true);
  
  // 寫入 PCM 取樣點數據
  let offset = 44;
  if (use8Bit) {
    for (let i = 0; i < samples.length; i++, offset++) {
      // float32 [-1, 1] 轉換為 uint8 [0, 255] (標準無正負號 8位元 PCM)
      const s = Math.max(-1, Math.min(1, samples[i]));
      const val = Math.round((s + 1) * 127.5);
      view.setUint8(offset, val);
    }
  } else {
    for (let i = 0; i < samples.length; i++, offset += 2) {
      // float32 [-1, 1] 轉換為 int16 [-32768, 32767]
      const s = Math.max(-1, Math.min(1, samples[i]));
      const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(offset, val, true);
    }
  }
  
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * 更新壓縮進度條 UI
 */
function updateCompressProgress(text, percent) {
  if (el.compressProgressWrapper) el.compressProgressWrapper.classList.remove('hidden');
  if (el.compressProgressText) el.compressProgressText.textContent = text;
  if (el.compressPercentText) el.compressPercentText.textContent = `${percent}%`;
  if (el.compressProgressBar) el.compressProgressBar.style.width = `${percent}%`;
}

/**
 * 重置壓縮按鈕與進度條 UI
 */
function resetCompressButton() {
  if (el.startAutoCompressBtn) {
    el.startAutoCompressBtn.disabled = false;
    el.startAutoCompressBtn.innerHTML = '<i class="fa-solid fa-compress"></i> 一鍵自動壓縮並轉譯';
    el.startAutoCompressBtn.style.background = '';
  }
  if (el.compressProgressWrapper) el.compressProgressWrapper.classList.add('hidden');
}

/**
 * 啟動本地音訊解碼與重取樣壓縮流程
 */
function startAudioCompression() {
  if (!pendingLargeFile) return;
  
  if (el.startAutoCompressBtn) {
    el.startAutoCompressBtn.disabled = true;
    el.startAutoCompressBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 正在解碼中...';
  }
  
  const fileReader = new FileReader();
  fileReader.onload = async function() {
    const arrayBuffer = this.result;
    try {
      updateCompressProgress('正在解碼音訊數據 (這可能需要 5-15 秒)...', 10);
      
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      updateCompressProgress('音訊解碼成功，正在配置重取樣參數...', 40);
      const duration = decodedBuffer.duration;
      
      // 動態分析合適的壓縮規格
      let sampleRate = 16000;
      let use8Bit = false;
      
      const size16k16b = duration * 16000 * 2;
      const size8k16b = duration * 8000 * 2;
      const size8k8b = duration * 8000 * 1;
      const size6k8b = duration * 6000 * 1;
      const size4k8b = duration * 4000 * 1;
      
      if (size16k16b <= 15000000) {
        sampleRate = 16000;
        use8Bit = false;
      } else if (size8k16b <= 15000000) {
        sampleRate = 8000;
        use8Bit = false;
      } else if (size8k8b <= 15000000) {
        sampleRate = 8000;
        use8Bit = true;
      } else if (size6k8b <= 15000000) {
        sampleRate = 6000;
        use8Bit = true;
      } else {
        sampleRate = 4000;
        use8Bit = true;
      }
      
      updateCompressProgress(`正在進行重取樣與單聲道混合 (${sampleRate}Hz)...`, 60);
      const resampledBuffer = await resampleAudioBuffer(decodedBuffer, sampleRate);
      
      updateCompressProgress('正在重構為輕量級 WAV 二進位數據...', 85);
      const wavBlob = audioBufferToWav(resampledBuffer, use8Bit);
      
      updateCompressProgress('自動壓縮順利完成！正在套用...', 100);
      
      setTimeout(() => {
        handleCompressedFile(wavBlob, pendingLargeFile.name);
      }, 500);
      
    } catch (err) {
      console.error('瀏覽器本地壓縮出錯:', err);
      showToast('本地壓縮失敗！請嘗試重試，或將檔案手動壓縮為低位元率 MP3 再上傳。', 'error');
      resetCompressButton();
    }
  };
  fileReader.readAsArrayBuffer(pendingLargeFile);
}

/**
 * 處理壓縮後的音訊檔案，將其更新至 IndexedDB 或新增為新會議並觸發轉譯
 */
async function handleCompressedFile(compressedBlob, originalName) {
  const baseName = originalName.replace(/\.[^/.]+$/, "");
  const compressedName = `${baseName}_compressed.wav`;
  
  // 隱藏 modal (內部會清空 pendingLargeFile，所以在這之前取得檔名)
  if (el.audioLimitModal) {
    el.audioLimitModal.classList.remove('active');
  }
  
  // 檢查是否是點選歷史失敗會議的「重新嘗試轉譯」所產生的壓縮
  if (currentMeeting && currentMeeting.audioData) {
    currentMeeting.audioData = compressedBlob;
    currentMeeting.audioName = compressedName;
    currentMeeting.audioMime = 'audio/wav';
    
    try {
      await saveMeeting(currentMeeting);
      
      // 更新音訊播放器連結
      const audioUrl = URL.createObjectURL(compressedBlob);
      el.audioPlayer.src = audioUrl;
      el.audioFileName.textContent = compressedName;
      
      showToast('音訊已成功壓縮，開始重新轉譯！', 'success');
      await triggerTranscription();
    } catch (err) {
      console.error('更新音訊失敗:', err);
      showToast('更新壓縮音訊檔案失敗！', 'error');
    }
  } else {
    // 全新上傳檔案的情境
    const createdAt = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    const newMeeting = {
      title: baseName,
      created_at: createdAt,
      audioData: compressedBlob,
      audioName: compressedName,
      audioMime: 'audio/wav',
      transcript: [],
      summary: '',
      action_items: ''
    };
    
    try {
      const id = await saveMeeting(newMeeting);
      newMeeting.id = id;
      currentMeeting = newMeeting;
      await refreshMeetingList();
      await loadMeeting(id);
      
      showToast('檔案壓縮成功！開始執行語音轉譯。', 'success');
      await triggerTranscription();
    } catch (err) {
      console.error('上傳處理失敗:', err);
      showToast('儲存壓縮音訊失敗！', 'error');
    }
  }
  
  pendingLargeFile = null;
}

function saveSettings() {
  const key = el.apiKeyInput.value.trim();
  const model = el.modelSelect ? el.modelSelect.value : 'gemini-1.5-flash';
  if (key) {
    try {
      localStorage.setItem('gemini_api_key', key);
      localStorage.setItem('gemini_model', model);
      showToast('Gemini API 設定已儲存！', 'success');
      hideSettingsModal();
    } catch (e) {
      console.error('儲存設定失敗:', e);
      showToast('儲存失敗，請檢查瀏覽器 Cookie/隱私設定。', 'error');
    }
  } else {
    showToast('請輸入有效的金鑰！', 'error');
  }
}

// ==================== 會議列表與載入 ====================
async function refreshMeetingList() {
  try {
    const list = await getAllMeetings();
    el.meetingCount.textContent = list.length;
    el.meetingList.innerHTML = '';

    if (list.length === 0) {
      el.meetingList.innerHTML = '<div class="empty-list-message">尚無會議紀錄</div>';
      return;
    }

    list.forEach(meet => {
      const item = document.createElement('div');
      item.className = 'meeting-item';
      if (currentMeeting && currentMeeting.id === meet.id) {
        item.classList.add('active');
      }

      item.innerHTML = `
        <h4>${escapeHtml(meet.title)}</h4>
        <div class="meeting-item-meta">
          <span><i class="fa-regular fa-clock"></i> ${meet.created_at}</span>
          ${meet.hasAudio ? '<span><i class="fa-solid fa-microphone-lines"></i> 錄音</span>' : ''}
        </div>
      `;

      item.addEventListener('click', () => loadMeeting(meet.id));
      el.meetingList.appendChild(item);
    });
  } catch (err) {
    console.error('重新整理清單失敗:', err);
  }
}

/**
 * 搜尋過濾歷史會議列表
 */
function filterMeetings() {
  const query = el.searchMeetingsInput.value.toLowerCase().trim();
  const items = el.meetingList.querySelectorAll('.meeting-item');

  items.forEach(item => {
    const title = item.querySelector('h4').textContent.toLowerCase();
    const meta = item.querySelector('.meeting-item-meta').textContent.toLowerCase();
    
    if (title.includes(query) || meta.includes(query)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

async function loadMeeting(id) {
  try {
    // 關閉手機版選單
    el.sidebar.classList.remove('active');

    // 若正在錄音則不可隨意切換
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      showToast('請先結束當前錄音再切換會議！', 'error');
      return;
    }

    const meeting = await getMeetingById(id);
    if (!meeting) return;

    currentMeeting = meeting;
    chatHistory = []; // 重設對話歷史

    // 切換高亮項目
    document.querySelectorAll('.meeting-item').forEach((item, index) => {
      // 依據 IndexedDB 的項目順序比對 ID
      // 這裡簡單的做法是直接重刷清單
    });
    await refreshMeetingList();

    // 顯示詳細視圖
    el.welcomeView.classList.remove('active');
    el.detailView.classList.add('active');

    // 設定會議資訊
    el.meetingTitleInput.value = meeting.title;
    el.meetingDateText.textContent = meeting.created_at;

    // 設定音軌播放器
    if (meeting.audioData) {
      const audioUrl = URL.createObjectURL(meeting.audioData);
      el.audioPlayer.src = audioUrl;
      el.audioFileName.textContent = meeting.audioName || '錄音音軌.webm';
      el.playerState.classList.remove('hidden');
      el.noAudioState.classList.add('hidden');
      el.recordingState.classList.add('hidden');
    } else {
      el.audioPlayer.src = '';
      el.playerState.classList.add('hidden');
      el.noAudioState.classList.remove('hidden');
      el.recordingState.classList.add('hidden');
    }

    // 渲染逐字稿
    renderTranscript(meeting.transcript || []);

    // 渲染 AI 摘要
    renderSummary(meeting.summary, meeting.action_items);

    // 載入簡報幻燈片


    // 載入筆記卡片
    await loadNoteCards(meeting.id);

    // 重置對話框
    el.chatMessages.innerHTML = `
      <div class="system-message">
        您好！我是您的會議筆記助理。這場會議的資料已加載完畢，您可以向我提問關於這場會議的細節。
      </div>
    `;

    // 切換回逐字稿分頁
    document.querySelector('[data-tab="tabTranscript"]').click();

  } catch (err) {
    console.error('載入會議詳情錯誤:', err);
    showToast('載入會議紀錄失敗！', 'error');
  }
}

// ==================== 建立新會議紀錄 ====================
async function createNewMeetingOffline() {
  // 不使用 prompt，直接以時間命名建立會議，用戶可直接在畫面上修改
  const dateStr = new Date().toLocaleDateString('zh-TW');
  const finalTitle = `會議紀錄_${dateStr}`;
  const createdAt = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

  const newMeeting = {
    title: finalTitle,
    created_at: createdAt,
    transcript: [],
    summary: '',
    action_items: ''
  };

  try {
    const id = await saveMeeting(newMeeting);
    newMeeting.id = id;
    await refreshMeetingList();
    await loadMeeting(id);
    showToast('已建立新會議！可直接在上方編輯標題名稱。', 'success');
  } catch (err) {
    console.error('建立會議失敗:', err);
    showToast('建立會議失敗！', 'error');
  }
}

async function saveCurrentMeetingTitle() {
  if (!currentMeeting) return;
  const newTitle = el.meetingTitleInput.value.trim() || '未命名會議';
  if (newTitle === currentMeeting.title) return;

  currentMeeting.title = newTitle;
  try {
    await saveMeeting(currentMeeting);
    await refreshMeetingList();
    showToast('已更名！', 'success');
  } catch (err) {
    console.error('更改會議標題失敗:', err);
  }
}

async function deleteCurrentMeeting() {
  if (!currentMeeting) return;

  // 雙重確認按鈕邏輯 (PWA 專屬，避免 confirm 卡死)
  const btn = el.deleteMeetingBtn;
  if (!btn.classList.contains('confirm-delete')) {
    btn.classList.add('confirm-delete');
    btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> 確定刪除？';
    showToast('請再次點擊「垃圾桶」確認刪除此會議！', 'error');
    
    // 3秒後若沒有再次點擊則復原
    setTimeout(() => {
      btn.classList.remove('confirm-delete');
      btn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    }, 3000);
    return;
  }

  // 第二次點擊，真正執行刪除
  btn.classList.remove('confirm-delete');
  btn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';

  try {
    const title = currentMeeting.title;
    await deleteMeeting(currentMeeting.id);
    currentMeeting = null;
    await refreshMeetingList();
    
    // 返回歡迎畫面
    el.detailView.classList.remove('active');
    el.welcomeView.classList.add('active');
    showToast(`會議「${title}」已刪除。`, 'success');
  } catch (err) {
    console.error('刪除會議失敗:', err);
    showToast('刪除失敗！', 'error');
  }
}

async function showWelcomeView() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    showToast('請先結束當前錄音！', 'error');
    return;
  }
  currentMeeting = null;
  await refreshMeetingList();
  el.detailView.classList.remove('active');
  el.welcomeView.classList.add('active');
  el.sidebar.classList.remove('active'); // 關閉手機側邊欄
}

// ==================== 錄音流程 ====================
async function startRecordingWorkflow() {
  // 檢查 API 金鑰是否存在
  if (!localStorage.getItem('gemini_api_key')) {
    showToast('請先在設定中輸入您的 Gemini API 金鑰！', 'error');
    showSettingsModal();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // 初始化或取得會議紀錄
    const createdAt = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    const newMeeting = {
      title: `即時錄音會議_${new Date().toLocaleDateString('zh-TW')}`,
      created_at: createdAt,
      transcript: [],
      summary: '',
      action_items: ''
    };

    const id = await saveMeeting(newMeeting);
    newMeeting.id = id;
    currentMeeting = newMeeting;
    await refreshMeetingList();
    await loadMeeting(id);

    // 啟動錄音介面
    el.noAudioState.classList.add('hidden');
    el.playerState.classList.add('hidden');
    el.recordingState.classList.remove('hidden');

    audioChunks = [];
    
    // 支援最佳音訊格式
    let options = { mimeType: 'audio/webm;codecs=opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'audio/webm' };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = {}; // 瀏覽器預設
    }

    mediaRecorder = new MediaRecorder(stream, options);
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      // 停止麥克風軌道，關閉錄音紅燈
      stream.getTracks().forEach(track => track.stop());

      // 合併音軌并正確識別 MIME Type
      let mimeType = options.mimeType;
      if (!mimeType && mediaRecorder && mediaRecorder.mimeType) {
        mimeType = mediaRecorder.mimeType;
      }
      if (!mimeType) {
        mimeType = 'audio/webm';
      }
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      
      // 依據實際 MIME Type 決定檔案副檔名
      let ext = 'webm';
      if (mimeType.includes('mp4')) ext = 'mp4';
      else if (mimeType.includes('mpeg')) ext = 'mp3';
      else if (mimeType.includes('ogg')) ext = 'ogg';
      else if (mimeType.includes('wav')) ext = 'wav';
      else if (mimeType.includes('m4a')) ext = 'm4a';
      else if (mimeType.includes('aac')) ext = 'aac';

      // 更新會議資訊並儲存
      currentMeeting.audioData = audioBlob;
      currentMeeting.audioName = `reco_recording_${Date.now()}.${ext}`;
      currentMeeting.audioMime = audioBlob.type;

      try {
        await saveMeeting(currentMeeting);
        
        // 重新載入，顯示播放器
        const audioUrl = URL.createObjectURL(audioBlob);
        el.audioPlayer.src = audioUrl;
        el.audioFileName.textContent = currentMeeting.audioName;
        el.playerState.classList.remove('hidden');
        el.recordingState.classList.add('hidden');

        // 主動觸發 AI 轉譯
        await triggerTranscription();
      } catch (err) {
        console.error('儲存錄音檔失敗:', err);
        showToast('錄音檔存檔失敗！', 'error');
      }
    };

    // 音波可視化 setup
    setupAudioVisualizer(stream);

    // 開始錄音 (每 10 秒觸發一次 dataavailable，以便儲存或做背景切片備用)
    mediaRecorder.start(10000);
    recordingStartTime = Date.now();
    updateTimer();
    recordingTimerInterval = setInterval(updateTimer, 1000);

  } catch (err) {
    console.error('獲取麥克風權限或啟動錄音失敗:', err);
    showToast('無法啟用錄音！請檢查麥克風權限設定。', 'error');
  }
}

function togglePauseRecording() {
  if (!mediaRecorder) return;
  
  if (mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
    clearInterval(recordingTimerInterval);
    el.pauseRecordBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    el.pauseRecordBtn.title = '繼續錄音';
    // 停止音波動畫
    if (visualizerAnimationId) {
      cancelAnimationFrame(visualizerAnimationId);
    }
  } else if (mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
    recordingStartTime = Date.now() - parseTimeToMs(el.recordingTimer.textContent);
    recordingTimerInterval = setInterval(updateTimer, 1000);
    el.pauseRecordBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    el.pauseRecordBtn.title = '暫停錄音';
    // 重啟音波動畫
    drawVisualizer();
  }
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
  
  mediaRecorder.stop();
  clearInterval(recordingTimerInterval);
  if (visualizerAnimationId) {
    cancelAnimationFrame(visualizerAnimationId);
  }
  el.recordingTimer.textContent = '00:00:00';
}

function updateTimer() {
  const diff = Date.now() - recordingStartTime;
  const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
  const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
  const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
  el.recordingTimer.textContent = `${hours}:${minutes}:${seconds}`;
}

function parseTimeToMs(timeStr) {
  const parts = timeStr.split(':');
  return (parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])) * 1000;
}

// ==================== 音波可視化 (Canvas Visualizer) ====================
function setupAudioVisualizer(stream) {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 256;
  source.connect(analyserNode);

  canvasContext = el.visualizerCanvas.getContext('2d');
  resizeCanvas();
  drawVisualizer();
}

function resizeCanvas() {
  if (el.visualizerCanvas) {
    el.visualizerCanvas.width = el.visualizerCanvas.parentElement.clientWidth;
    el.visualizerCanvas.height = el.visualizerCanvas.parentElement.clientHeight;
  }
}

function drawVisualizer() {
  if (!analyserNode || !canvasContext) return;

  const width = el.visualizerCanvas.width;
  const height = el.visualizerCanvas.height;
  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const draw = () => {
    visualizerAnimationId = requestAnimationFrame(draw);
    analyserNode.getByteFrequencyData(dataArray);

    canvasContext.clearRect(0, 0, width, height);

    // 霓虹漸層
    const gradient = canvasContext.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(0.5, '#8b5cf6');
    gradient.addColorStop(1, '#d946ef');

    canvasContext.fillStyle = 'transparent';
    canvasContext.fillRect(0, 0, width, height);

    const barWidth = (width / bufferLength) * 1.8;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * height * 0.9;

      canvasContext.fillStyle = gradient;
      // 繪製圓角柱狀體
      const y = (height - barHeight) / 2;
      canvasContext.beginPath();
      canvasContext.roundRect(x, y, barWidth - 2, barHeight, 4);
      canvasContext.fill();

      x += barWidth;
    }
  };

  draw();
}

// 輔助方法：對上傳檔案 (特別是 iOS Safari/Chrome 的 m4a) 的 MIME Type 進行安全過濾與規範化映射
function sanitizeAudioMimeType(file) {
  let mime = file.type;
  const name = file.name ? file.name.toLowerCase() : '';
  const ext = name.split('.').pop();
  
  console.log(`Original file name: ${file.name}, type: ${mime}, ext: ${ext}`);

  // 若 MIME 為空、通用流或未知，依據副檔名進行映射
  if (!mime || mime === '' || mime.includes('octet-stream')) {
    if (ext === 'mp3') return 'audio/mp3';
    if (ext === 'wav') return 'audio/wav';
    if (ext === 'm4a') return 'audio/mp4';
    if (ext === 'mp4') return 'audio/mp4';
    if (ext === 'aac') return 'audio/aac';
    if (ext === 'webm') return 'audio/webm';
    if (ext === 'ogg') return 'audio/ogg';
    if (ext === 'flac') return 'audio/flac';
    if (ext === 'amr') return 'audio/amr';
    return 'audio/webm'; // 預設值
  }

  // 標準化非標準 MIME 字串
  mime = mime.toLowerCase();
  if (mime === 'audio/x-m4a' || mime === 'audio/m4a') return 'audio/mp4';
  if (mime === 'audio/x-aac' || mime === 'audio/aac') return 'audio/aac';
  if (mime === 'audio/x-wav' || mime === 'audio/wave' || mime === 'audio/wav') return 'audio/wav';
  if (mime === 'audio/mpeg' || mime === 'audio/mp3') return 'audio/mp3';
  if (mime === 'audio/x-flac' || mime === 'audio/flac') return 'audio/flac';

  return mime;
}

// ==================== 音訊檔案上傳流程 ====================
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 檢查金鑰
  if (!localStorage.getItem('gemini_api_key')) {
    showToast('請先在設定中輸入您的 Gemini API 金鑰！', 'error');
    showSettingsModal();
    return;
  }

  // 大小限制提示（20MB）
  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > 20) {
    showAudioLimitModal(sizeMb);
    el.fileUploadInput.value = '';
    return;
  }

  const createdAt = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  const finalTitle = file.name.replace(/\.[^/.]+$/, "") || '上傳會議';

  const newMeeting = {
    title: finalTitle,
    created_at: createdAt,
    audioData: file,
    audioName: file.name,
    audioMime: sanitizeAudioMimeType(file),
    transcript: [],
    summary: '',
    action_items: ''
  };

  try {
    const id = await saveMeeting(newMeeting);
    newMeeting.id = id;
    currentMeeting = newMeeting;
    await refreshMeetingList();
    await loadMeeting(id);

    // 觸發轉譯
    await triggerTranscription();
  } catch (err) {
    console.error('上傳處理失敗:', err);
    showToast('儲存檔案失敗！', 'error');
  } finally {
    // 重設 input
    el.fileUploadInput.value = '';
  }
}

// ==================== Gemini API 連線與核心邏輯 ====================

/**
 * 輔助方法：將 Blob 轉為 Base64 字串
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 觸發語音轉譯
 */
async function triggerTranscription() {
  if (!currentMeeting || !currentMeeting.audioData) {
    showToast('找不到關聯的音訊檔案，無法進行轉譯。', 'error');
    return;
  }

  // 檢查檔案大小限制 (20MB)
  const sizeMb = currentMeeting.audioData.size / (1024 * 1024);
  if (sizeMb > 20) {
    showAudioLimitModal(sizeMb);
    return;
  }

  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    showToast('請先設定 Gemini API 金鑰！', 'error');
    showSettingsModal();
    return;
  }

  // 顯示進度 UI
  el.transcribeStatusBanner.classList.remove('hidden');
  el.transcriptControls.classList.add('hidden');
  el.transcribeStatusText.textContent = 'AI 正在分析會議音訊...';
  el.transcribeProgressDetail.textContent = '語音檔案越大需要越久時間，請耐心等候（一般約需 30-90 秒）。';

  // 自動切換至逐字稿分頁，確保使用者能看到轉譯進度
  const transcriptTabBtn = document.querySelector('[data-tab="tabTranscript"]');
  if (transcriptTabBtn) {
    transcriptTabBtn.click();
  }

  try {
    // 1. 將音訊轉換為 Base64
    const base64Audio = await blobToBase64(currentMeeting.audioData);
    
    // 2. 確定語系提示
    const langHint = el.languageHintSelect.value;
    
    // 3. 調用 API
    const model = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `
      你是一個專業的會議逐字稿生成助理。請仔細聆聽這段音訊，並完成以下任務：
      
      1. 細緻識別出不同的說話者（依據音色、語氣、上下文邏輯進行區分），並用 "說話者 A", "說話者 B", "說話者 C" 這樣統一的代號標註。如果知道是特定人名，可以寫人名，但必須前後一致。
      2. 每段對話必須包含精確的開始時間（start）與結束時間（end），時間戳格式為 MM:SS 或 HH:MM:SS（如 00:03, 02:45, 01:12:05）。
      3. 語意轉換或換人說話時必須分段。
      4. 逐字稿內容（text）請使用台灣的繁體中文習慣。若語音中出現英文、術語或多國語言，請精準保留，並確保拼音與用詞正確。
      5. 主要識別語言提示：${langHint}。
    `;

    // 結構化輸出 schema
    const responseSchema = {
      type: "ARRAY",
      description: "逐字稿段落列表",
      items: {
        type: "OBJECT",
        properties: {
          speaker: { type: "STRING", description: "發言人代稱，例如 說話者 A, 說話者 B。" },
          start: { type: "STRING", description: "發言開始時間戳，格式 MM:SS 或 HH:MM:SS" },
          end: { type: "STRING", description: "發言結束時間戳，格式 MM:SS 或 HH:MM:SS" },
          text: { type: "STRING", description: "該發言人的完整談話內容。" }
        },
        required: ["speaker", "start", "end", "text"]
      }
    };

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: currentMeeting.audioMime || 'audio/webm',
                data: base64Audio
              }
            },
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1
      }
    };

    el.transcribeStatusText.textContent = 'API 已受理，正在產生結構化逐字稿...';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API 請求錯誤: ${response.statusText}. 詳情: ${errText}`);
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error('Gemini API 未回傳逐字稿內容，請檢查金鑰或音軌格式是否正確。');
    }

    const transcriptJson = JSON.parse(responseText.trim());

    // 儲存至資料庫
    currentMeeting.transcript = transcriptJson;
    await saveMeeting(currentMeeting);

    // 渲染逐字稿
    renderTranscript(transcriptJson);

    // 自動接著生成 AI 摘要與待辦
    el.transcribeStatusText.textContent = '轉寫完成！正在自動生成 AI 摘要...';
    await triggerSummaryGeneration(false); // 傳入 false 表示不要彈出 alert

  } catch (err) {
    console.error('轉譯失敗:', err);
    showToast(`語音轉譯失敗：${err.message}`, 'error');

    let helpTip = '';
    if (err.message.includes('429') || err.message.toLowerCase().includes('quota')) {
      helpTip = `
        <div style="margin-top: 14px; padding: 10px; background: rgba(56, 189, 248, 0.1); border: 1px dashed rgba(56, 189, 248, 0.3); border-radius: 6px; text-align: left; font-size: 0.85rem; color: #38bdf8; line-height: 1.5;">
          <i class="fa-solid fa-lightbulb"></i> <strong>提示：</strong>您遇到了 Google Gemini API 的額度超限限制 (429 錯誤)。
          <br>如果您在設定中選擇了 <strong>Gemini 2.5 Flash</strong>，請點選右上角齒輪設定，將模型改為 <strong>Gemini 1.5 Flash</strong> 或 <strong>2.5 Flash-Lite</strong>（它們每日提供 1500 次免費額度，而 2.5 Flash 僅有 20 次限制）。或者您也可以嘗試更換 API Key 或稍後再試。
        </div>
      `;
    }

    // 將詳細錯誤渲染到逐字稿容器中，方便使用者排查問題與重新執行
    el.transcriptContainer.innerHTML = `
      <div class="empty-transcript-message" style="padding: 30px 15px;">
        <i class="fa-solid fa-circle-exclamation" style="color: #ef4444; font-size: 2.5rem; margin-bottom: 12px;"></i>
        <p style="font-weight: 600; color: #ef4444; margin-bottom: 6px; font-size: 1.1rem;">語音轉譯失敗</p>
        <div style="font-size: 0.9rem; color: var(--text-secondary); max-width: 85%; text-align: center; line-height: 1.5; margin-bottom: 16px; word-break: break-all; margin-left: auto; margin-right: auto;">
          錯誤詳情：${escapeHtml(err.message)}
          ${helpTip}
        </div>
        <button class="btn-secondary" id="errorRetryBtn" style="padding: 8px 16px;">
          <i class="fa-solid fa-rotate"></i> 重新嘗試轉譯
        </button>
      </div>
    `;
    const retryBtn = document.getElementById('errorRetryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', triggerTranscription);
    }
  } finally {
    el.transcribeStatusBanner.classList.add('hidden');
    el.transcriptControls.classList.remove('hidden');
  }
}

/**
 * 渲染逐字稿 HTML
 */
function renderTranscript(transcript) {
  el.transcriptContainer.innerHTML = '';

  if (!transcript || transcript.length === 0) {
    el.transcriptContainer.innerHTML = `
      <div class="empty-transcript-message">
        <i class="fa-solid fa-language"></i>
        <p>尚無逐字稿。請點擊「重新轉譯」或重新錄音/上傳。</p>
      </div>
    `;
    return;
  }

  transcript.forEach((segment, index) => {
    const div = document.createElement('div');
    div.className = 'transcript-segment';
    div.innerHTML = `
      <div class="segment-header">
        <input type="text" class="speaker-badge-edit" value="${escapeHtml(segment.speaker)}" data-index="${index}">
        <span class="segment-time" data-time="${segment.start}" title="點擊跳轉播放">${segment.start}</span>
      </div>
      <div class="segment-content" contenteditable="true" data-index="${index}">${escapeHtml(segment.text)}</div>
    `;

    // 點擊時間戳播放
    div.querySelector('.segment-time').addEventListener('click', (e) => {
      const timeStr = e.target.getAttribute('data-time');
      jumpAudioToTime(timeStr);
    });

    // 發言人名稱修改事件
    const speakerInput = div.querySelector('.speaker-badge-edit');
    speakerInput.addEventListener('blur', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      const val = e.target.value.trim() || '未知名說話者';
      
      // 更新所有相同說話者代號的名稱以方便用戶
      const oldName = currentMeeting.transcript[idx].speaker;
      currentMeeting.transcript.forEach(seg => {
        if (seg.speaker === oldName) seg.speaker = val;
      });
      
      saveMeeting(currentMeeting).then(() => renderTranscript(currentMeeting.transcript));
    });

    // 逐字稿內容修改事件
    const contentDiv = div.querySelector('.segment-content');
    contentDiv.addEventListener('blur', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      const val = e.target.innerText.trim();
      currentMeeting.transcript[idx].text = val;
      saveMeeting(currentMeeting);
    });

    el.transcriptContainer.appendChild(div);
  });
}

function jumpAudioToTime(timeStr) {
  if (!el.audioPlayer.src) return;

  const parts = timeStr.split(':');
  let seconds = 0;
  
  if (parts.length === 2) {
    // MM:SS
    seconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  } else if (parts.length === 3) {
    // HH:MM:SS
    seconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
  }

  el.audioPlayer.currentTime = seconds;
  el.audioPlayer.play();
}

/**
 * 觸發生成 AI 摘要與待辦
 */
async function triggerSummaryGeneration(showAlert = true) {
  if (!currentMeeting) return;
  if (!currentMeeting.transcript || currentMeeting.transcript.length === 0) {
    if (showAlert) showToast('請先生成逐字稿，再由 AI 生成摘要！', 'error');
    return;
  }

  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    if (showAlert) showToast('請先設定 Gemini API 金鑰！', 'error');
    return;
  }

  if (showAlert) {
    el.aiSummaryText.innerHTML = '<p class="placeholder-text"><i class="fa-solid fa-spinner fa-spin"></i> AI 正在閱讀逐字稿並整理摘要中...</p>';
    el.aiActionItemsText.innerHTML = '<p class="placeholder-text"><i class="fa-solid fa-spinner fa-spin"></i> 待辦清單整理中...</p>';
  }

  try {
    const model = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const formattedTranscript = currentMeeting.transcript.map(t => `[${t.start}] ${t.speaker}: ${t.text}`).join('\n');
    
    const prompt = `
      你是一位專業的行政與專案管理助理。請仔細閱讀以下會議的逐字稿內容，並完成以下任務：
      1. 生成精確的會議摘要（包含：會議主旨、主要討論議題、關鍵決議點）。使用漂亮的 Markdown 語法（善用標題、清單與粗體標記）。
         【排版規範】：在「主要討論議題」中，請使用無序清單格式（例如：- **議題主題**：該議題的討論要點與細節描述），確保每個議題主題與其描述內容都寫在同一個清單項目 (li) 中在同一行完成，切勿換行或單獨使用冒號起行，以保持版面整潔。
      2. 整理一份清晰的待辦清單 (Action Items)（包含：執行人、具體任務內容、期限，若逐字稿有提及）。每個任務前請使用 - [ ] 語法格式化。
      
      請一律使用台灣習慣的繁體中文。

      【逐字稿內容】：
      ${formattedTranscript}
    `;

    const responseSchema = {
      type: "OBJECT",
      properties: {
        summary: { type: "STRING", description: "Markdown 格式 the 會議摘要" },
        action_items: { type: "STRING", description: "Markdown 格式 the 待辦清單" }
      },
      required: ["summary", "action_items"]
    };

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errDetail = '';
      try {
        const errJson = await response.json();
        errDetail = errJson.error?.message || JSON.stringify(errJson);
      } catch (e) {
        try {
          errDetail = await response.text();
        } catch (e2) {
          errDetail = response.statusText;
        }
      }
      throw new Error(`AI 生成摘要失敗 (${response.status}): ${errDetail}`);
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error('未取得 AI 摘要回覆');
    }

    const aiResult = JSON.parse(responseText.trim());

    // 儲存至資料庫
    currentMeeting.summary = aiResult.summary;
    currentMeeting.action_items = aiResult.action_items;
    await saveMeeting(currentMeeting);

    // 渲染
    renderSummary(aiResult.summary, aiResult.action_items);
    if (showAlert) showToast('AI 摘要與待辦清單已成功生成！', 'success');

  } catch (err) {
    console.error('摘要生成錯誤:', err);
    el.aiSummaryText.innerHTML = `<p style="color:var(--status-danger)">摘要生成錯誤：${err.message}</p>`;
    el.aiActionItemsText.innerHTML = '';
  }
}

function renderSummary(summary, actionItems) {
  if (summary) {
    el.aiSummaryText.innerHTML = parseMarkdown(summary);
  } else {
    el.aiSummaryText.innerHTML = '<p class="placeholder-text">點擊下方按鈕或轉譯完成後，AI 將自動生成會議摘要。</p>';
  }

  if (actionItems) {
    el.aiActionItemsText.innerHTML = parseMarkdown(actionItems);
    
    // 綁定待辦清單的核取方塊點擊事件
    const checkBoxes = el.aiActionItemsText.querySelectorAll('input[type="checkbox"]');
    checkBoxes.forEach((cb, index) => {
      // 在 HTML 中 checkbox 可以被交互，我們可以在這裡讓使用者打勾
      cb.removeAttribute('disabled'); // 預設 markdown 輸出的 checkbox 是 disabled，這裡開放打勾
      cb.addEventListener('change', () => {
        // 使用者勾選後的狀態可以寫回 markdown string（可選）
      });
    });
  } else {
    el.aiActionItemsText.innerHTML = '<p class="placeholder-text">待辦清單將與摘要一同生成。</p>';
  }
}

/**
 * 簡易的 Markdown 轉 HTML 引擎 (專門支援列點、標題、粗體、checkbox)
 */
function parseMarkdown(md) {
  if (!md) return '';
  let html = md;

  // 避開簡單的 HTML 注入
  html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 1. 處理標題
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // 2. 處理待辦核取方塊
  html = html.replace(/^\s*-\s*\[\s*\]\s*(.*$)/gim, '<p><input type="checkbox"> $1</p>');
  html = html.replace(/^\s*-\s*\[x\]\s*(.*$)/gim, '<p><input type="checkbox" checked> <del>$1</del></p>');

  // 3. 處理無序清單
  html = html.replace(/^\s*-\s*(.*$)/gim, '<ul><li>$1</li></ul>');
  // 處理緊鄰的 <ul> 合併（簡易版）
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // 4. 處理粗體
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 5. 換行處理 (將非標題和非清單行轉為段落，並處理冒號開頭的說明行)
  const lines = html.split('\n');
  const renderedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<li') || trimmed.startsWith('<p') || trimmed.startsWith('</ul')) {
      return line;
    }
    // 若行首為冒號，視為上文的延伸說明，進行縮排排版
    if (trimmed.startsWith(':') || trimmed.startsWith('：')) {
      const cleanText = trimmed.replace(/^[:：]\s*/, '');
      return `<p class="markdown-desc">${cleanText}</p>`;
    }
    return `<p>${line}</p>`;
  });

  return renderedLines.join('\n');
}

// ==================== AI Chat 助理 (NotebookLM Q&A) ====================
async function sendChatMessage() {
  if (!currentMeeting) {
    showToast('請先選擇或建立會議紀錄，才能與 AI 助理對話。', 'error');
    return;
  }
  const question = el.chatInput.value.trim();
  if (!question) return;

  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    showToast('請設定 Gemini API 金鑰後再發送對話！', 'error');
    showSettingsModal();
    return;
  }

  // 顯示用戶訊息
  appendChatMessage('user', question);
  el.chatInput.value = '';

  // 顯示 AI Loading 狀態
  const aiMessageId = appendChatMessage('ai', '<i class="fa-solid fa-spinner fa-spin"></i> AI 正在閱讀紀錄並思考中...');

  try {
    const model = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const hasTranscript = currentMeeting.transcript && currentMeeting.transcript.length > 0;
    const formattedTranscript = hasTranscript 
      ? currentMeeting.transcript.map(t => `[${t.start}] ${t.speaker}: ${t.text}`).join('\n')
      : '（此會議目前尚無錄音轉譯的逐字稿）';

    const notes = await getNotesByMeetingId(currentMeeting.id);
    const notesContent = (notes && notes.length > 0)
      ? notes.map((n, idx) => `[備註卡片 ${idx + 1}] ${n.content}`).join('\n')
      : '（此會議目前尚無個人備註卡片筆記）';

    const systemInstruction = `
      你是一位貼心的會議筆記助理。你熟悉以下會議的所有細節。
      你的任務是協助用戶從以下這份會議背景資訊中尋找答案、回答問題、澄清疑慮、或是協助重新整理、起草信件。
      
      【會議標題】：${currentMeeting.title}
      【會議時間】：${currentMeeting.created_at}
      
      【會議逐字稿背景資訊】：
      ${formattedTranscript}
      
      【會議個人備註卡片筆記】：
      ${notesContent}
      
      規則：
      1. 優先根據上方的會議資訊與備註進行回答。如果在逐字稿與備註中找不到相關內容，且使用者詢問關於會議的具體決議或發言，請老實告訴用戶「根據會議紀錄，似乎沒有提及此內容」。如果使用者是進行一般的討論、問候或要求基於現有資訊起草內容，請直接友善地協助。
      2. 請使用台灣習慣的繁體中文，語氣保持專業與親切。
      3. 如果有需要，可以適度引用逐字稿中的時間戳（例如：在 05:20 處，說話者 A 點出了...）。
    `;

    // 組裝歷史訊息 (限制最近 10 次對話以防 Context 過大)
    const contents = chatHistory.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // 加入目前的新問題
    contents.push({
      role: 'user',
      parts: [{ text: question }]
    });

    const requestBody = {
      contents: contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.5
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errDetail = '';
      try {
        const errJson = await response.json();
        errDetail = errJson.error?.message || JSON.stringify(errJson);
      } catch (e) {
        try {
          errDetail = await response.text();
        } catch (e2) {
          errDetail = response.statusText;
        }
      }
      throw new Error(`AI 對話回應失敗 (${response.status}): ${errDetail}`);
    }

    const result = await response.json();
    const replyText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!replyText) {
      throw new Error('未取得 AI 回覆內容');
    }

    // 更新 AI 訊息內容
    updateChatMessage(aiMessageId, parseMarkdown(replyText));

    // 儲存至對話歷史
    chatHistory.push({ role: 'user', text: question });
    chatHistory.push({ role: 'ai', text: replyText });

  } catch (err) {
    console.error('Chat 錯誤:', err);
    updateChatMessage(aiMessageId, `<span style="color:var(--status-danger)">對話出錯：${err.message}</span>`);
  }
}

function appendChatMessage(role, text) {
  const div = document.createElement('div');
  const uniqueId = 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  div.className = `chat-message ${role}`;
  div.id = uniqueId;
  div.innerHTML = text;

  el.chatMessages.appendChild(div);
  el.chatMessages.scrollTop = el.chatMessages.scrollHeight;

  return uniqueId;
}

function updateChatMessage(id, html) {
  const div = document.getElementById(id);
  if (div) {
    div.innerHTML = html;
    el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
  }
}

// ==================== 備註卡片 (NotebookLM Notes) ====================
async function loadNoteCards(meetingId) {
  try {
    const list = await getNotesByMeetingId(meetingId);
    el.noteCount.textContent = list.length;
    el.notesList.innerHTML = '';

    if (list.length === 0) {
      el.notesList.innerHTML = '<div class="empty-notes-message">尚無備註卡片。您可以在這裡記錄與本次會議相關的個人想法。</div>';
      return;
    }

    list.forEach(note => {
      const card = document.createElement('div');
      card.className = 'note-card';
      card.innerHTML = `
        <div class="note-card-header">
          <span><i class="fa-regular fa-calendar"></i> ${note.created_at}</span>
          <button class="btn-delete-note" data-note-id="${note.id}" title="刪除筆記"><i class="fa-regular fa-trash-can"></i></button>
        </div>
        <div class="note-card-content">${escapeHtml(note.content)}</div>
      `;

      card.querySelector('.btn-delete-note').addEventListener('click', async (e) => {
        e.stopPropagation();
        const noteId = parseInt(e.currentTarget.getAttribute('data-note-id'));
        
        // 刪除筆記卡片直接刪除，並顯示 toast 提示
        await deleteNote(noteId);
        await loadNoteCards(meetingId);
        showToast('已刪除筆記卡片。', 'success');
      });

      el.notesList.appendChild(card);
    });
  } catch (err) {
    console.error('載入筆記卡片錯誤:', err);
  }
}

async function addNewNoteCard() {
  if (!currentMeeting) {
    showToast('請先選擇或建立會議紀錄，再新增備註卡片！', 'error');
    return;
  }
  const content = el.noteInput.value.trim();
  if (!content) return;

  const createdAt = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  const newNote = {
    meeting_id: currentMeeting.id,
    content: content,
    created_at: createdAt
  };

  try {
    await saveNote(newNote);
    el.noteInput.value = '';
    await loadNoteCards(currentMeeting.id);
    showToast('已新增筆記卡片。', 'success');
  } catch (err) {
    console.error('儲存筆記卡片失敗:', err);
    showToast('儲存筆記失敗！', 'error');
  }
}

// ==================== 匯出功能 ====================
function exportMeetingData() {
  if (!currentMeeting) return;

  const title = currentMeeting.title;
  const date = currentMeeting.created_at;
  const summary = currentMeeting.summary || '尚無摘要';
  const actionItems = currentMeeting.action_items || '尚無待辦事項';
  
  let transcriptText = '尚無逐字稿';
  if (currentMeeting.transcript && currentMeeting.transcript.length > 0) {
    transcriptText = currentMeeting.transcript.map(t => `[${t.start} - ${t.end}] ${t.speaker}: ${t.text}`).join('\n');
  }

  // Markdown 模板
  const markdownContent = `# 會議紀錄: ${title}
日期: ${date}

---

## 一、會議摘要
${summary}

---

## 二、待辦清單 (Action Items)
${actionItems}

---

## 三、完整逐字稿
\`\`\`text
${transcriptText}
\`\`\`
`;

  // 下載檔案
  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.replace(/\s+/g, '_')}_會議紀錄.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==================== 實用工具方法 ====================
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 顯示自訂 Toast 提示訊息
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // 3. 秒後自動滑出並刪除
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// ==================== 鎖屏偽裝螢幕保護程式邏輯 ====================

// 啟動鎖屏偽裝
async function activateFakeLockScreen() {
  if (mediaRecorder && mediaRecorder.state !== 'recording') {
    showToast('請先開始錄音，再啟用鎖屏偽裝！', 'error');
    return;
  }

  // 嘗試獲取 Wake Lock 鎖定螢幕常亮
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Screen Wake Lock 已成功啟動，防止螢幕自動休眠');
    }
  } catch (err) {
    console.warn('啟動 Wake Lock 失敗:', err);
  }

  // 更新時間日期
  updateLockScreenTime();
  const timeInterval = setInterval(() => {
    if (el.fakeLockScreen.classList.contains('active')) {
      updateLockScreenTime();
    } else {
      clearInterval(timeInterval);
    }
  }, 10000);

  // 顯示鎖屏遮罩層
  el.fakeLockScreen.classList.remove('unlocking');
  el.fakeLockScreen.classList.add('active');
  showToast('偽裝鎖屏已啟動，錄音中且防止螢幕休眠。', 'success');
}

// 關閉鎖屏偽裝
async function deactivateFakeLockScreen() {
  el.fakeLockScreen.classList.remove('active');
  el.fakeLockScreen.classList.remove('unlocking');

  // 釋放 Wake Lock
  if (wakeLock !== null) {
    try {
      await wakeLock.release();
      wakeLock = null;
      console.log('Screen Wake Lock 已釋放');
    } catch (err) {
      console.error('釋放 Wake Lock 失敗:', err);
    }
  }
}

// 更新鎖屏時間日期
function updateLockScreenTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  if (el.lockScreenTime) {
    el.lockScreenTime.textContent = `${hours}:${minutes}`;
  }

  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekDay = weekDays[now.getDay()];
  if (el.lockScreenDate) {
    el.lockScreenDate.textContent = `${month}月${day}日 ${weekDay}`;
  }
}

// 手勢滑動解鎖邏輯
function setupLockScreenSwipeGesture() {
  if (!el.fakeLockScreen) return;

  let startY = 0;
  let currentY = 0;
  const minSwipeDistance = 120; // 最小滑動像素值觸發解鎖

  el.fakeLockScreen.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: true });

  el.fakeLockScreen.addEventListener('touchmove', (e) => {
    currentY = e.touches[0].clientY;
    const diffY = startY - currentY;
    if (diffY > 0) {
      // 往上滑動時，加上實時位移效果 (拖曳感)
      el.fakeLockScreen.style.transform = `translateY(-${diffY}px)`;
    }
  }, { passive: true });

  el.fakeLockScreen.addEventListener('touchend', () => {
    const diffY = startY - currentY;
    el.fakeLockScreen.style.transform = ''; // 清除拖曳行內樣式

    if (diffY > minSwipeDistance) {
      // 觸發解鎖
      el.fakeLockScreen.classList.add('unlocking');
      setTimeout(() => {
        deactivateFakeLockScreen();
      }, 300);
    }
  });

  // 電腦端輔助點擊解鎖（防呆）
  el.fakeLockScreen.addEventListener('click', () => {
    el.fakeLockScreen.classList.add('unlocking');
    setTimeout(() => {
      deactivateFakeLockScreen();
    }, 300);
  });
}

// ==================== 簡報幻燈片一鍵生成與渲染邏輯 ====================



// 匯出 A4 一頁總覽 PDF (動態填充列印專用容器並調用列印)
async function exportOnepageToPdf() {
  if (!currentMeeting) {
    showToast('沒有可列印的會議資料！', 'error');
    return;
  }

  const printContainer = document.getElementById('a4PrintContainer');
  if (!printContainer) return;

  const title = el.meetingTitleInput ? el.meetingTitleInput.value.trim() : '未命名會議';
  const date = el.meetingDateText ? el.meetingDateText.textContent : '';
  
  // 取得摘要與待辦 (去除 placeholder 樣式，只取實質內容)
  let summaryHtml = '';
  if (el.aiSummaryText) {
    const isPlaceholder = el.aiSummaryText.querySelector('.placeholder-text') !== null;
    summaryHtml = isPlaceholder ? '<p>尚無重點摘要</p>' : el.aiSummaryText.innerHTML;
  } else {
    summaryHtml = '<p>無會議摘要</p>';
  }

  let actionItemsHtml = '';
  if (el.aiActionItemsText) {
    const isPlaceholder = el.aiActionItemsText.querySelector('.placeholder-text') !== null;
    actionItemsHtml = isPlaceholder ? '<p>尚無待辦事項</p>' : el.aiActionItemsText.innerHTML;
  } else {
    actionItemsHtml = '<p>無待辦事項</p>';
  }

  // 取得備註卡片清單 (直接從 IndexedDB 資料庫讀取，比從 DOM 擷取更穩定)
  let notesHtml = '';
  try {
    const notes = await getNotesByMeetingId(currentMeeting.id);
    if (notes && notes.length > 0) {
      notesHtml = '<div class="print-notes-grid">';
      notes.forEach(note => {
        notesHtml += `
          <div class="print-note-card">
            <p class="print-note-text">${escapeHtml(note.content)}</p>
            <span class="print-note-time">${note.created_at}</span>
          </div>
        `;
      });
      notesHtml += '</div>';
    } else {
      notesHtml = '<p class="no-notes">尚無備註卡片</p>';
    }
  } catch (err) {
    console.error('列印時取得備註卡片失敗:', err);
    notesHtml = '<p class="no-notes">讀取備註卡片失敗</p>';
  }

  // 填寫列印專用 HTML
  printContainer.innerHTML = `
    <div class="print-onepage-layout">
      <div class="print-header">
        <div class="print-logo">
          <i class="fa-solid fa-microphone-lines"></i> RECO AI 會議總覽報告
        </div>
        <h1>${title}</h1>
        <div class="print-meta">
          <span><i class="fa-solid fa-calendar-day"></i> 會議時間：${date}</span>
        </div>
      </div>
      
      <div class="print-section">
        <h3><i class="fa-solid fa-list-check"></i> 會議重點摘要</h3>
        <div class="print-content markdown-body">${summaryHtml}</div>
      </div>

      <div class="print-section">
        <h3><i class="fa-solid fa-circle-exclamation"></i> 待辦清單 (Action Items)</h3>
        <div class="print-content markdown-body">${actionItemsHtml}</div>
      </div>

      <div class="print-section">
        <h3><i class="fa-solid fa-note-sticky"></i> 會議備註卡片</h3>
        <div class="print-content">${notesHtml}</div>
      </div>

      <div class="print-footer">
        <p>報告由 RECO AI 智慧助理生成 • 僅供內部參考</p>
      </div>
    </div>
  `;

  // 設定列印類別為一頁總覽
  document.body.classList.remove('print-mode-slides');
  document.body.classList.add('print-mode-onepage');

  // 調用列印
  window.print();
}
