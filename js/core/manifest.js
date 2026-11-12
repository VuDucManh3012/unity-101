/* Course manifest: sections + lessons, mirrors the Unity Developer Roadmap.
 * Each lesson's content lives in js/lessons/<section>/<id>.js (lazy-loaded). */
window.U101 = window.U101 || {};

U101.sections = [
  { id: 'basics', title: 'Basics', vi: 'Nền tảng', color: '#5b8def', tint: '#eef2f6' },
  { id: 'memory', title: 'Resources + Memory', vi: 'Tài nguyên & bộ nhớ', color: '#e066c0', tint: '#fbeef3' },
  { id: 'visual', title: 'Visual', vi: 'Hình ảnh', color: '#33b585', tint: '#edf6ee' },
  { id: 'gameplay', title: 'Gameplay', vi: 'Lối chơi', color: '#8a73e0', tint: '#f1eef6' },
  { id: 'architecture', title: 'Project Architecture', vi: 'Kiến trúc dự án', color: '#3f7fd8', tint: '#edf1f6' },
  { id: 'next-level', title: 'Next Level', vi: 'Nâng cao', color: '#e0609f', tint: '#fbedf2' },
];

// node = roadmap box the lesson belongs to; topics = leaf items covered.
U101.lessons = [
  // ── Basics ──
  { id: 'csharp-basics', section: 'basics', node: '.NET/C#', title: 'C# cơ bản: biến & kiểu', topics: ['C# Basics', '.NET'] },
  { id: 'mono-il2cpp', section: 'basics', node: '.NET/C#', title: 'Mono vs IL2CPP', topics: ['Mono/IL2CPP'] },
  { id: 'collections-linq', section: 'basics', node: '.NET/C#', title: 'Collections & LINQ', topics: ['C# collections', 'LINQ'] },
  { id: 'events-delegates', section: 'basics', node: '.NET/C#', title: 'Event & Delegate', topics: ['Event/Delegate'] },
  { id: 'gameobject-component', section: 'basics', node: 'Unity Basics', title: 'GameObject & Component', topics: ['GameObjects'] },
  { id: 'monobehaviour-lifecycle', section: 'basics', node: 'Unity Basics', title: 'Vòng đời MonoBehaviour', topics: ['MonoBehaviour'] },
  { id: 'prefabs', section: 'basics', node: 'Unity Basics', title: 'Prefab, Nested & Variant', topics: ['Prefabs', 'Nested Prefabs', 'Prefab Variants'] },
  { id: 'scenes', section: 'basics', node: 'Unity Basics', title: 'Scene & Load Scene', topics: ['Scenes'] },
  { id: 'git-basics', section: 'basics', node: 'Version Control', title: 'Git: commit, branch, merge', topics: ['Git', 'Github'] },

  // ── Resources + Memory ──
  { id: 'value-reference', section: 'memory', node: 'Memory', title: 'Value vs Reference, Boxing', topics: ['Value/reference types', 'boxing/unboxing'] },
  { id: 'garbage-collector', section: 'memory', node: 'Memory', title: 'Garbage Collector', topics: ['Garbage collector'] },
  { id: 'idisposable', section: 'memory', node: 'Memory', title: 'Managed/Unmanaged & IDisposable', topics: ['Managed/unmanaged resources', 'IDisposable/Dispose'] },
  { id: 'assets-addressables', section: 'memory', node: 'Resources', title: 'Assets, Bundles & Addressables', topics: ['Assets', 'Asset Bundles', 'Addressables'] },

  // ── Visual ──
  { id: 'ui-rect-anchors', section: 'visual', node: 'UI', title: 'Unity UI: RectTransform & Anchor', topics: ['Unity UI', 'UI Elements', 'Text Mesh Pro'] },
  { id: 'animator-state-machine', section: 'visual', node: 'Animation', title: 'Animator State Machine', topics: ['Animation', 'Animator', 'Timeline'] },
  { id: 'tween-easing', section: 'visual', node: 'Animation', title: 'Tween & Easing (DOTween)', topics: ['DOTween'] },
  { id: 'cinemachine-camera', section: 'visual', node: 'Animation', title: 'Camera follow (Cinemachine)', topics: ['Cinemachine'] },
  { id: 'lighting', section: 'visual', node: '2D/3D', title: 'Ánh sáng & Normal', topics: ['Lighting'] },
  { id: 'shaders', section: 'visual', node: '2D/3D', title: 'Shader & Shader Graph', topics: ['Shaders', 'Shader Graph'] },
  { id: 'render-pipelines', section: 'visual', node: '2D/3D', title: 'Render Pipeline: URP vs HDRP', topics: ['Render Pipelines', 'URP', 'HDRP'] },

  // ── Gameplay ──
  { id: 'vector-math', section: 'gameplay', node: 'Physics', title: 'Toán vector: Dot, Cross, Lerp', topics: ['Math'] },
  { id: 'rigidbody-colliders', section: 'gameplay', node: 'Physics', title: 'Rigidbody & Collider', topics: ['Colliders', 'RigidBodies'] },
  { id: 'raycast-layers', section: 'gameplay', node: 'Physics', title: 'Raycast, Overlap & Layer', topics: ['Raycast', 'Overlaps', 'Layers'] },
  { id: 'ai-fsm', section: 'gameplay', node: 'AI', title: 'Finite State Machine', topics: ['Decision Making', 'Finite State Machines', 'Decision Trees'] },
  { id: 'ai-behaviour-utility', section: 'gameplay', node: 'AI', title: 'Behaviour Tree & Utility AI', topics: ['Behaviour Trees', 'Utility AI'] },
  { id: 'pathfinding-astar', section: 'gameplay', node: 'AI', title: 'Tìm đường A*', topics: ['Pathfinders', 'A*', 'Unity Navigation'] },
  { id: 'netcode-prediction', section: 'gameplay', node: 'Multiplayer', title: 'Multiplayer: Prediction & Lag', topics: ['Networking Basics', 'Prediction', 'Interpolation', 'LagCompensation'] },

  // ── Project Architecture ──
  { id: 'design-principles', section: 'architecture', node: 'Design Principles', title: 'SOLID, KISS, DRY, YAGNI', topics: ['SOLID', 'KISS', 'DRY', 'YAGNI', 'Clean Code'] },
  { id: 'observer-singleton', section: 'architecture', node: 'Design Patterns', title: 'Singleton & Observer', topics: ['Singleton', 'Observer'] },
  { id: 'command-state', section: 'architecture', node: 'Design Patterns', title: 'Command & State', topics: ['Command', 'State'] },
  { id: 'object-pool', section: 'architecture', node: 'Design Patterns', title: 'Object Pool', topics: ['Object Pool'] },
  { id: 'mv-patterns-di', section: 'architecture', node: 'Architectural Patterns', title: 'MVC/MVP/MVVM & DI', topics: ['MV* patterns', 'Dependency Injection', 'Zenject', 'Reactive programming', 'UniRx'] },
  { id: 'dod-ecs', section: 'architecture', node: 'Architectural Patterns', title: 'OOP vs DOD/ECS', topics: ['OOP', 'DOD', 'ECS', 'Unity DOTS'] },
  { id: 'algorithms-bigo', section: 'architecture', node: 'Algorithms', title: 'Thuật toán & Big O', topics: ['Asymptotic complexity/ big O', 'Algorithms', 'Data Structures', 'Binary search', 'Sortings', 'Hash tables'] },

  // ── Next Level ──
  { id: 'profiler', section: 'next-level', node: 'Optimizations and profiling', title: 'Profiler & tối ưu frame', topics: ['Unity Profiler', 'Memory Profiler', 'Android/IOS Profiling'] },
  { id: 'coroutines-async', section: 'next-level', node: 'Concurrency', title: 'Coroutine, async/await, UniTask', topics: ['Coroutines', 'async/await', 'UniTask'] },
  { id: 'editor-tools', section: 'next-level', node: 'Editor', title: 'Tùy biến Editor', topics: ['Editor Customizations'] },
  { id: 'build-pipeline', section: 'next-level', node: 'Build', title: 'Build Pipeline', topics: ['Scriptable Build Pipeline', 'Build with gradle', 'Build with XCode', 'Unity Cloud Build'] },
  { id: 'live-ops-tools', section: 'next-level', node: 'Tools', title: 'Analytics, Ads & Push', topics: ['Analytics Tools', 'Ads Tools', 'Push notification Tools', 'Support Tools'] },
  { id: 'testing', section: 'next-level', node: 'Testing', title: 'Unit test & Test Framework', topics: ['Unit Tests', 'Auto Tests', 'Benchmarks', 'Load Testing', 'Unity Test Framework'] },
];

U101.lessonById = (id) => U101.lessons.find((l) => l.id === id);
U101.sectionById = (id) => U101.sections.find((s) => s.id === id);
