/**
 * Camera Helper Utility for Cross-Platform & Android Compatibility
 * Handles resilient constraint negotiation, insecure context detection, Chrome flags guidance, and iframe permissions.
 */

export interface CameraStreamOptions {
  idealWidth?: number;
  idealHeight?: number;
  facingMode?: 'environment' | 'user';
}

/**
 * Checks if current page is running within a Secure Context (HTTPS or localhost).
 * Android Chrome strictly disables `navigator.mediaDevices` and suppresses camera
 * permission prompts when running on non-secure contexts (e.g. http://192.168.x.x:3000).
 */
export function isSecureContextEnvironment(): boolean {
  if (typeof window === 'undefined') return true;

  if (typeof window.isSecureContext === 'boolean') {
    return window.isSecureContext;
  }

  const host = window.location.hostname;
  const proto = window.location.protocol;

  return (
    proto === 'https:' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]'
  );
}

/**
 * Checks if current browser environment supports getUserMedia
 */
export function isMediaDevicesSupported(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

/**
 * Checks if current runtime is an Android device
 */
export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent || '');
}

/**
 * Checks if the application is running inside an iframe (such as AI Studio preview or embedded frame)
 */
export function isRunningInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Generates instructions for enabling Chrome Android camera permissions on local HTTP origins
 * via chrome://flags/#unsafely-treat-insecure-origin-as-secure.
 */
export function getChromeFlagsInstructions(customOrigin?: string): {
  flagsUrl: string;
  targetOrigin: string;
  steps: string[];
} {
  const origin =
    customOrigin ||
    (typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'http://localhost:3000');

  return {
    flagsUrl: 'chrome://flags/#unsafely-treat-insecure-origin-as-secure',
    targetOrigin: origin,
    steps: [
      `Buka tab baru di Google Chrome HP Anda, lalu buka: chrome://flags/#unsafely-treat-insecure-origin-as-secure`,
      `Pada opsi "Insecure origins treated as secure", tempelkan alamat URL kasir ini: ${origin}`,
      `Ubah status dari "Disabled" menjadi "Enabled".`,
      `Ketuk tombol biru "Relaunch" di bagian bawah layar untuk me-restart Chrome.`,
      `Buka kembali aplikasi kasir ini — prompt konfirmasi "Izinkan Kamera" akan langsung muncul!`,
    ],
  };
}

/**
 * Requests video stream with resilient fallback cascade for Android devices
 * Prevents OverconstrainedError by progressively relaxing constraints.
 */
export async function getResilientCameraStream(
  options: CameraStreamOptions = {}
): Promise<MediaStream> {
  if (!isSecureContextEnvironment()) {
    throw new Error(
      'Koneksi HTTP Lokal (Insecure Context): Browser Android menonaktifkan kamera streaming langsung melalui HTTP. Silakan gunakan tombol "Foto Kamera HP" atau aktifkan URL di chrome://flags.'
    );
  }

  if (!isMediaDevicesSupported()) {
    throw new Error(
      'Perangkat atau browser Anda tidak mendukung akses kamera langsung (getUserMedia). Silakan gunakan kamera bawaan HP via tombol foto berkas.'
    );
  }

  const preferredFacing = options.facingMode || 'environment';

  // Constraint sets to try progressively
  const constraintCascades: MediaStreamConstraints[] = [
    // 1. Ideal back camera with resolution if requested
    {
      video: {
        facingMode: { ideal: preferredFacing },
        ...(options.idealWidth ? { width: { ideal: options.idealWidth } } : {}),
        ...(options.idealHeight ? { height: { ideal: options.idealHeight } } : {}),
      },
      audio: false,
    },
    // 2. Strict facingMode without resolution constraints
    {
      video: { facingMode: preferredFacing },
      audio: false,
    },
    // 3. Fallback: Any available video device on the system
    {
      video: true,
      audio: false,
    },
  ];

  let lastError: any = null;

  for (const constraints of constraintCascades) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (err: any) {
      lastError = err;
      // If user explicitly denied permission, do not loop over other constraints
      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        String(err).includes('Permission denied')
      ) {
        throw err;
      }
      // Otherwise continue to more relaxed constraints (e.g. OverconstrainedError, NotFoundError)
    }
  }

  throw lastError || new Error('Gagal menginisialisasi aliran kamera video.');
}

export interface CameraErrorInfo {
  title: string;
  message: string;
  isPermissionDenied: boolean;
  isIframeIssue: boolean;
  isInsecureContext: boolean;
  actionType: 'chrome_flags' | 'native_capture' | 'browser_permission' | 'iframe_external' | 'retry';
}

/**
 * Parses camera errors into friendly, actionable Indonesian troubleshooting instructions
 */
export function getCameraErrorMessage(error: any): CameraErrorInfo {
  const errMsg = String(error?.message || error?.name || error || '').toLowerCase();
  const inIframe = isRunningInIframe();
  const isSecure = isSecureContextEnvironment();

  // 1. Insecure HTTP Context on Android/Mobile (The #1 root cause of "prompt izin kamera tidak muncul")
  if (!isSecure) {
    return {
      title: 'Koneksi HTTP Lokal (Prompt Izin Dibatasi Browser)',
      message:
        'Browser Chrome di Android mematikan jendela konfirmasi izin kamera pada alamat IP lokal (HTTP non-HTTPS) demi privasi. Solusi tercepat: gunakan tombol "Foto Barcode (Kamera HP)" yang langsung aktif tanpa perlu izin browser!',
      isPermissionDenied: false,
      isIframeIssue: false,
      isInsecureContext: true,
      actionType: 'native_capture',
    };
  }

  const isDenied =
    errMsg.includes('notallowed') ||
    errMsg.includes('permission denied') ||
    errMsg.includes('permissiondenied') ||
    error?.name === 'NotAllowedError';

  if (isDenied) {
    if (inIframe) {
      return {
        title: 'Izin Kamera Diblokir di Preview Frame',
        message:
          'Browser Android membatasi izin kamera di dalam jendela preview iframe. Buka aplikasi di tab baru atau gunakan tombol "Foto Barcode via Kamera HP".',
        isPermissionDenied: true,
        isIframeIssue: true,
        isInsecureContext: false,
        actionType: 'iframe_external',
      };
    }
    return {
      title: 'Izin Akses Kamera Ditolak',
      message:
        'Akses kamera diblokir oleh browser Android. Ketuk ikon gembok 🔒 di samping URL browser > "Izin situs" > Ubah Kamera menjadi "Izinkan", lalu muat ulang halaman.',
      isPermissionDenied: true,
      isIframeIssue: false,
      isInsecureContext: false,
      actionType: 'browser_permission',
    };
  }

  if (
    errMsg.includes('notfound') ||
    errMsg.includes('devicesnotfound') ||
    error?.name === 'NotFoundError'
  ) {
    return {
      title: 'Kamera Tidak Ditemukan',
      message:
        'Tidak ada unit kamera yang terdeteksi di perangkat ini. Pastikan modul kamera aktif atau gunakan tombol pengambilan foto berkas.',
      isPermissionDenied: false,
      isIframeIssue: false,
      isInsecureContext: false,
      actionType: 'native_capture',
    };
  }

  if (
    errMsg.includes('notreadable') ||
    errMsg.includes('trackstart') ||
    error?.name === 'NotReadableError'
  ) {
    return {
      title: 'Kamera Sedang Dipakai Aplikasi Lain',
      message:
        'Kamera sedang aktif di aplikasi lain (misal WhatsApp, Instagram, atau kamera bawaan). Silakan tutup aplikasi tersebut lalu muat ulang.',
      isPermissionDenied: false,
      isIframeIssue: false,
      isInsecureContext: false,
      actionType: 'retry',
    };
  }

  return {
    title: 'Gagal Menghubungkan Kamera',
    message: `Terjadi kendala kamera perangkat: ${error?.message || 'Kamera tidak dapat diaktifkan'}. Anda dapat menggunakan tombol "Foto Kamera HP" sebagai alternatif praktis.`,
    isPermissionDenied: false,
    isIframeIssue: inIframe,
    isInsecureContext: !isSecure,
    actionType: !isSecure ? 'chrome_flags' : 'native_capture',
  };
}
