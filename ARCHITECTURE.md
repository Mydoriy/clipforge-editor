# KIẾN TRÚC HỆ THỐNG CLIPFORGE DESKTOP WEB (ARCHITECTURE)

> **Dự án**: ClipForge Desktop Web • 9:16 Vertical Video Studio  
> **Kiến trúc cốt lõi**: Local-First, Zero-Server Rendering, Client-Side Hardware Acceleration  
> **Tiêu chuẩn công nghệ**: W3C WebCodecs API, WebGL2, WebGPU, Web Audio API, Dexie IndexedDB v2, WebAssembly (FFmpeg / ONNX)

---

## 1. TỔNG QUAN KIẾN TRÚC TOÀN HỆ THỐNG (HIGH-LEVEL ARCHITECTURE)

```mermaid
flowchart TD
    subgraph UI ["Lớp Giao Diện (Presentation Layer)"]
        Home["Home Dashboard (Projects, Templates, AI Cards)"]
        EditorView["Fullscreen Video Editor (/editor/:id)"]
        DesignStudio["Design Studio (Canvas 9:16 Graphics)"]
        EditPilot["EditPilot AI Assistant (Natural Language Commands)"]
    end

    subgraph State ["Lớp Quản Lý Trạng Thái (Zustand Immutable Store)"]
        EditorStore["useEditorStore (Timelines, Clips, Tracks, Selection)"]
        UndoRedo["Dual-Stack Past/Future History (Max 50 checkpoints)"]
        PureOps["Pure Logic Operators (split, trim, snap, rippleDelete)"]
    end

    subgraph Engine ["Lớp Nhân Tính Toán & Xử Lý Media (Core Engines)"]
        Compositor["Video Compositor (WebCodecs + Canvas 9:16)"]
        GLPipeline["WebGL2 / 3D LUT Color Pipeline (Rec.709 shaders)"]
        AudioEngine["Web Audio Master Clock & Synthesizer"]
        WorkersPool["Isolated Web Workers (FFmpeg, Whisper, Exporter)"]
    end

    subgraph Storage ["Lớp Lưu Trữ & Bền Vững Dữ Liệu (Local-First Storage)"]
        DexieDB["Dexie.js IndexedDB v2 (Projects, Media, Settings)"]
        OPFS["OPFS & FileSystemWritableFileStream (Streaming Export)"]
        CrashJournal["Crash Recovery Journal & Web Locks API"]
        CloudQueue["Offline Sync Queue & Supabase RLS (Optional)"]
    end

    UI --> State
    State --> Engine
    Engine --> Storage
```

---

## 2. SƠ ĐỒ PIPELINE VIDEO COMPOSITOR (PREVIEW & EXPORT)

Quy trình render đảm bảo nguyên lý **Preview = Export**: cùng một đường ống tính toán canvas offscreen và shader WebGL2 được sử dụng cho cả phát lại thời gian thực và xuất file thành phẩm.

```mermaid
sequenceDiagram
    autonumber
    participant Playhead as "Audio Clock / Playhead (ms)"
    participant Decoder as "VideoDecoder / HTMLVideoElement"
    participant Offscreen as "OffscreenCanvas (1080x1920)"
    participant Shader as "WebGL2 3D LUT Shader"
    participant Overlay as "Text / SVG / Sticker Layer"
    participant StreamOut as "FileSystemWritable / MP4 Muxer"

    Playhead->>Decoder: Request frame tại thời điểm t
    Decoder-->>Offscreen: Vẽ raw frame (áp transform: scale, rotate, crop 9:16)
    Offscreen->>Shader: Nạp frame texture + 3D LUT cube matrix
    Shader-->>Offscreen: Áp bộ lọc màu điện ảnh (Color grading)
    Offscreen->>Overlay: Vẽ phụ đề, văn bản, vector sticker và transition
    alt Chế độ Preview
        Offscreen-->>Playhead: Hiển thị lên PlayerCanvas (≥30-60 fps)
    else Chế độ Export Streaming
        Offscreen->>StreamOut: Trích xuất VideoFrame -> VideoEncoder (H.264/AAC) -> chunk ghi vào đĩa
    end
```

---

## 3. KIẾN TRÚC WEB WORKERS ĐA NHIỆM (WORKERS ISOLATION)

Các tác vụ nặng về tính toán hoặc xử lý file lớn đều được tách biệt vào các Web Worker riêng biệt thông qua dynamic blob URL (`toBlobURL`), đảm bảo giao diện chính (Main Thread) duy trì 60fps mượt mà:

```mermaid
graph LR
    Main["Main Thread (React UI & User Events)"]

    subgraph WorkerLayer ["Lớp Worker Cô Lập (Non-Blocking Workers)"]
        FFmpegWorker["FFmpeg.wasm Worker\n(LGPL v2.1+ Core / SharedArrayBuffer)"]
        WhisperWorker["Whisper AI Worker\n(@xenova/transformers / ONNX)"]
        AudioWorker["Audio Processing Worker\n(RMS calculation, beat detection)"]
        SceneWorker["Scene Detection Worker\n(3-channel RGB histogram diff)"]
    end

    Main -- "PostMessage (Raw Blob / ArrayBuffer)" --> FFmpegWorker
    Main -- "PostMessage (16kHz Mono PCM Audio)" --> WhisperWorker
    Main -- "PostMessage (Audio Float32Array)" --> AudioWorker
    Main -- "PostMessage (Video Sample Frames)" --> SceneWorker

    FFmpegWorker -- "Transcoded MP4 / Trimmed Blob" --> Main
    WhisperWorker -- "SRT / VTT Subtitle Segments" --> Main
    AudioWorker -- "Waveform Peaks & RMS Energy" --> Main
    SceneWorker -- "Scene Cut Timestamps & 9:16 Crops" --> Main
```

---

## 4. KIẾN TRÚC LƯU TRỮ & ĐỘ BỀN DỮ LIỆU (STORAGE & PERSISTENCE)

```mermaid
flowchart TD
    subgraph Browser ["Môi Trường Trình Duyệt Cục Bộ"]
        subgraph IndexedDB ["Dexie IndexedDB v2 (db.ts)"]
            T_Projects["projects (Metadata, Tracks, Clips JSON)"]
            T_Media["media (Blobs, FileHandles, Thumbnails, Waveforms)"]
            T_Trash["trash (Deleted projects retention 30 days)"]
            T_Snapshots["snapshots (Autosave version history checkpoints)"]
        end

        subgraph Guard ["Cơ Chế Bảo Vệ & Phục Hồi"]
            WebLocks["Web Locks API (navigator.locks)\nNgăn mở 2 tab cùng project"]
            RecoveryJournal["crash_recovery_journal\nNhật ký thao tác dở dang"]
            PersistStorage["navigator.storage.persist()\nChống hệ điều hành tự dọn cache"]
        end

        subgraph ExportFS ["Hệ Thống Tệp Ghi Trực Tiếp"]
            StreamSink["FileSystemWritableFileStream\n(Ghi streaming trực tiếp vào ổ cứng không tốn RAM)"]
        end
    end

    subgraph Cloud ["Đám Mây Tùy Chọn (Supabase RLS)"]
        SyncQueue["localStorage (clipforge_offline_sync_queue)"]
        RemoteDB["Supabase Postgres (Row Level Security)"]
        Conflict["LWW Resolution + Auto Clone [Bản sao xung đột]"]
    end

    IndexedDB <--> Guard
    IndexedDB --> ExportFS
    IndexedDB <--> SyncQueue
    SyncQueue <--> Conflict <--> RemoteDB
```

---

## 5. MÔ HÌNH QUẢN LÝ TRẠNG THÁI (STATE & IMMUTABILITY)

```mermaid
graph TD
    UserAction["Thao Tác Người Dùng (Split, Trim, Delete, Move)"] --> Dispatch["Action Handler trong useEditorStore"]
    
    subgraph PureEngine ["Bộ Toán Tử Thuần Túy (Pure Logic)"]
        SplitOp["splitClip()"]
        TrimOp["trimClipStart() / trimClipEnd()"]
        RippleOp["rippleDelete()"]
        SnapOp["calculateSnapPoint()"]
    end
    
    Dispatch --> PureEngine
    PureEngine --> NewState["State Mới (Bất biến - Immutable State)"]
    
    subgraph HistoryStack ["Quản Lý Lịch Sử Undo / Redo"]
        Past["Past Stack (Tối đa 50 bước)"]
        Current["Current State"]
        Future["Future Stack (Làm rỗng khi có action mới)"]
    end
    
    NewState --> Current
    Current --> Past
    NewState --> Autosave["Debounced Autosave (IndexedDB / Journal)"]
```

---

## 6. QUY TẮC BẢO TRÌ VÀ MỞ RỘNG (ENGINEERING PRINCIPLES)
1. **Zero Server Dependency**: Ứng dụng phải luôn chạy hoàn chỉnh ở chế độ Guest ngoại tuyến mà không yêu cầu backend, không gửi dữ liệu ra ngoài trừ khi người dùng chủ động cấu hình.
2. **Deterministic Timeline Mathematics**: Mọi toán tử biến đổi timeline phải là hàm thuần túy (pure functions) nhận `(clips, ...params)` và trả về mảng `clips` mới, có unit test tự động xác minh.
3. **Hardware-First Encoding**: Ưu tiên WebCodecs hardware encoder trước khi fallback về WebAssembly để đảm bảo tốc độ và tiết kiệm pin thiết bị.

